/* eslint-disable @typescript-eslint/member-ordering */
/* eslint-disable no-underscore-dangle */
import { BehaviorSubject, firstValueFrom, NEVER, Observable, Subject, Subscription } from 'rxjs';
import { map, mapTo, skip, tap } from 'rxjs/operators';

// Desiderata:
//  - refresh() returns a Promise that completes when a new value is available
//  - invoking refresh() while a refresh is ongoing does not refetch data from the source
//  - invalidations immediately mark the value as stale
//  - invalidations that are concurrent with a fetch mark its result as stale
//  - invalidations of an unsubscribed value prune it from the cache
//  - the cached value is kept alive even upon invalidation if there is a subscription

export class Cache<K, V> {
  private readonly cache = new Map<K, V>();

  constructor(private readonly factory: (key: K, evict: () => void) => V) { }

  tryGet(key: K): V | undefined {
    return this.cache.get(key);
  }

  get(key: K): V {
    let value = this.tryGet(key);
    if (value === undefined) {
      value = this.factory(key, () => this.cache.delete(key));
      if (value === undefined) {
        throw new Error('Caching of undefined values is unsupported');
      }
      this.cache.set(key, value);
    }

    return value;
  }

  clear(): void {
    this.cache.clear();
  }
}

type SourceValue<T> = {
  fresh: false;
} | {
  fresh: true;
  value: T;
};

interface CachedValue<T> {
  fresh: boolean;
  value: T;
}

type CachedState<T> = CachedValue<T> | { error: any };

export class Cacheable<T> {
  private refreshingInvalidated = false;
  private refreshing$: Promise<unknown> = Promise.resolve();
  private queuedRefresh$?: Promise<T>;

  private disposed = false;
  private sourceSubscription?: Subscription;

  private readonly state$ = new BehaviorSubject<CachedState<T> | undefined>(undefined);
  get state() {
    return this.state$.value;
  }
  get value() {
    const state = this.state;
    return !state || 'error' in state ? undefined : state;
  }

  private _observers = 0;
  get hasObservers(): boolean {
    return this._observers > 0;
  }

  private readonly _dispose$ = new Subject<void>();
  get dispose$(): Observable<void> {
    return this._dispose$;
  }

  readonly data$ = new Observable<CachedValue<T>>((subscriber) => {
    if (this.disposed) {
      throw new Error('Subscription to an evicted cache');
    }

    this._observers++;
    this.attachSource();

    const stateSubscription = this.state$.subscribe((x) => {
      if (!x) {
        return;
      } else if ('error' in x) {
        subscriber.error(x.error);
      } else {
        subscriber.next(x);
      }
    });

    if (this.state$.value === undefined && this._observers === 1) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.refresh();
    }

    return () => {
      this._observers--;
      stateSubscription.unsubscribe();
    };
  });

  constructor(
    private readonly fetch: () => Promise<T>,
    private readonly source$: Observable<SourceValue<T>> = NEVER,
  ) {
  }

  invalidate(): void {
    // invalidate the state that is being fetched concurrently with the invalidation
    this.refreshingInvalidated = true;

    // invalidate the current state
    const current = this.state$.value;
    if (!current) {
      // no value; no need to invalidate
    } else if ('error' in current) {
      this.state$.next({ error: current.error });
    } else {
      this.state$.next({
        fresh: false,
        value: current.value,
      });
    }
  }

  refreshWith(value: T): void {
    this.attachSource();
    this.state$.next({
      fresh: true,
      value,
    });
  }

  refreshWithError(error: any): void {
    this.attachSource();
    this.state$.next({ error });
  }

  refresh(): Promise<T> {
    // if refreshing$ is fulfilled, we are idle; otherwise, a fetch is ongoing;
    // if queuedRefresh$ is undefined, there are no queued operations
    // otherwise, as soon as refreshing$ becomes fulfilled, it is replaced by the queued promise
    if (!this.queuedRefresh$) {
      const queued$ = this.refreshing$.then(async () => {
        this.refreshing$ = queued$;
        this.queuedRefresh$ = undefined;

        this.refreshingInvalidated = false;
        try {
          const value = await this.fetch();
          this.refreshWith(value);
          return value;
        } catch (e) {
          this.refreshWithError(e);
          throw e;
        } finally {
          if (this.refreshingInvalidated) { // an invalidation occurred during the fetch
            this.invalidate();
          }
        }
      });

      this.queuedRefresh$ = queued$;
    }

    return this.queuedRefresh$;
  }

  dispose(): void {
    this.disposed = true;

    const subscription = this.sourceSubscription;
    if (subscription) {
      this.sourceSubscription = undefined;
      subscription.unsubscribe();
    }

    this._dispose$.next();
  }

  private attachSource(): void {
    if (this.sourceSubscription) {
      return;
    }

    this.sourceSubscription = this.source$.subscribe((state) => {
      if (!this.hasObservers) { // the state changed while nobody is caring anymore; dispose
        this.dispose();
      } else if (state.fresh) {
        this.refreshWith(state.value);
      } else {
        this.invalidate();
      }
    });
  }
}

/** Utility's functions */

export const snapshot = <T>(source: Cacheable<T>): Cacheable<T> => {
  const r = new Cacheable(
    async () => {
      const current = await firstValueFrom(source.data$);
      return current.fresh ? current.value : source.refresh();
    },
    source.data$.pipe(skip(1), mapTo({ fresh: false })),
  );

  r.dispose$.subscribe(() => {
    if (!source.hasObservers) {
      source.dispose();
    }
  });

  return r;
};

export const snapshotValue = <T>(source: Cacheable<T>): Observable<T> =>
  snapshot(source).data$.pipe(map(({ value }) => value));

export const autorefresh = <T>(source: Cacheable<T>): Observable<CachedValue<T>> =>
  source.data$.pipe(
    tap(async ({ fresh }) => {
      if (!fresh) {
        await source.refresh();
      }
    }),
  );

export const autorefreshValue = <T>(source: Cacheable<T>): Observable<T> =>
  autorefresh(source).pipe(map(({ value }) => value));

export const cachedList = <K, V extends { id: K }>(values: V[], cache: Cache<K, Cacheable<V>>): Cacheable<V>[] =>
  values.map((value) => {
    const cached = cache.get(value.id);
    cached.refreshWith(value);
    return cached;
  });
