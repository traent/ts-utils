import {
  animationFrameScheduler,
  BehaviorSubject,
  combineLatest,
  from,
  isObservable,
  Observable,
  ObservableInput,
  ObservableInputTuple,
  ObservedValueOf,
  of,
  OperatorFunction,
  scheduled,
} from 'rxjs';
import { filter, first, switchMap, switchMapTo } from 'rxjs/operators';

export class ReadonlyBehaviorSubject<T> {
  get value(): T {
    return this.subject$.value;
  }

  get value$(): Observable<T> {
    return this.subject$;
  }

  constructor(private readonly subject$: BehaviorSubject<T>) {
  }
}

export const inputIsNotNullOrUndefined = <T>(input: T): input is Exclude<T, null | undefined> => input !== null && input !== undefined;
export const isNotNullOrUndefined = <T>(): (source$: Observable<T>) => Observable<Exclude<T, null | undefined>> =>
  filter(inputIsNotNullOrUndefined);

export const firstNotNullOrUndefined = <T>(): (source$: Observable<T>) => Observable<Exclude<T, null | undefined>> =>
  first(inputIsNotNullOrUndefined);

export const maybeSwitchMap =
  <T, O extends ObservableInput<any>>(project: (value: T) => O): OperatorFunction<T | null | undefined, ObservedValueOf<O> | undefined> =>
  switchMap((maybeValue: T | null | undefined) => maybeValue ? project(maybeValue) : of(undefined));

/**
 * Determine if the argument is shaped like a Promise
 * allow any Promise/A+ compliant thenable.
 * It's up to the caller to ensure that obj.then conforms to the spec
 */
export const isPromise = <T = any>(obj: any): obj is Promise<T> => !!obj && typeof obj.then === 'function';

export const wrapIntoObservable = <T>(value: T | Promise<T> | Observable<T>): Observable<T> => {
  if (isObservable(value)) {
    return value;
  }

  if (isPromise(value)) {
    // Use `Promise.resolve()` to wrap promise-like instances.
    // Required ie when a Resolver returns a AngularJS `$q` promise to correctly trigger the
    // change detection.
    return from(Promise.resolve(value));
  }

  return of(value);
};

export const waitAnimationFrame = () => switchMapTo(scheduled([1], animationFrameScheduler));

export const combineLatestOrEmpty = <A extends readonly unknown[]>(sources: readonly [...ObservableInputTuple<A>]): Observable<A> =>
  sources.length ? combineLatest(sources) : of([] as any as A);
