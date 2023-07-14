/* eslint-disable no-underscore-dangle */
/* eslint-disable @typescript-eslint/member-ordering */
import { BehaviorSubject, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

import { ReadonlyBehaviorSubject } from './observable';

export interface UIListState {
  start?: number;
  end?: number;
  startIndex?: number;
  limit: number;
}

export interface UIIndexable {
  index?: number;
}

export class UIList<T extends UIIndexable> {
  private readonly _completeNext$ = new BehaviorSubject(false);
  private readonly _completePrev$ = new BehaviorSubject(false);
  private readonly _loadingNext$ = new BehaviorSubject(false);
  private readonly _loadingPrev$ = new BehaviorSubject(false);
  private readonly _items$ = new BehaviorSubject<T[]>([]);
  private readonly _error$ = new BehaviorSubject(false);
  private readonly _listState$: BehaviorSubject<UIListState>;

  readonly completeNext = new ReadonlyBehaviorSubject(this._completeNext$);
  readonly completePrev = new ReadonlyBehaviorSubject(this._completePrev$);
  readonly loadingNext = new ReadonlyBehaviorSubject(this._loadingNext$);
  readonly loadingPrev = new ReadonlyBehaviorSubject(this._loadingPrev$);
  readonly items = new ReadonlyBehaviorSubject(this._items$);
  readonly error = new ReadonlyBehaviorSubject(this._error$);
  readonly listState: ReadonlyBehaviorSubject<UIListState>;
  readonly loading$ = combineLatest([this.completePrev.value$, this.completeNext.value$]).pipe(map(([prev, next]) => prev || next));

  constructor(
    private readonly fetchMore: (start?: number, end?: number, limit?: number) => Promise<Array<T>>,
    readonly initialState: UIListState,
  ) {
    this._listState$ = new BehaviorSubject(initialState);
    this.listState = new ReadonlyBehaviorSubject(this._listState$);
  }

  async loadMore(direction?: 'prev' | 'next'): Promise<void> {
    this._error$.next(false);

    const loading$ = direction === 'next' ? this._loadingNext$ : this._loadingPrev$;
    loading$.next(true);

    try {
      const { startIndex, start, end, limit } = this.listState.value;

      if (!direction && start === undefined && end === undefined && startIndex === undefined) {
        // No start/end provided, get initial page
        const fetchedItems = await this.fetchMore(start, end, limit);
        this._listState$.next({
          ...this.listState.value,
          start: fetchedItems[0]?.index,
          end: fetchedItems[fetchedItems.length - 1]?.index,
        });
        this._completeNext$.next(true);
        if (fetchedItems.length < limit) {
          this._completePrev$.next(true);
        }
        this._items$.next(fetchedItems);

      } else if (!direction && start === undefined && end === undefined && startIndex) {
        // Get inital page for specific index
        if (startIndex && !start && !end) {
          const fetchStart = startIndex - limit / 2;
          const fetchEnd = startIndex + limit / 2;
          const fetchedItems = await this.fetchMore(fetchStart, fetchEnd, limit);

          const startIndexPosition = fetchedItems.findIndex((item) => item.index === startIndex);
          if (startIndexPosition < limit / 2) {
            this._completePrev$.next(true);
          }
          if (fetchedItems.length - startIndexPosition < limit / 2) {
            this._completeNext$.next(true);
          }
          this._listState$.next({ ...this.listState.value, start: fetchStart, end: fetchEnd });
          this._items$.next(fetchedItems);
        }

      } else if (end && direction === 'next') {
        const fetchStart = end;
        const fetchEnd = fetchStart + limit;

        const fetchedItems = await this.fetchMore(fetchStart, fetchEnd, limit);
        if (fetchedItems.length < this.listState.value.limit) {
          this._completeNext$.next(true);
        }

        this._listState$.next({ ...this.listState.value, end: fetchEnd });
        this._items$.next([...this.items.value, ...fetchedItems]);

      } else if (start && direction === 'prev') {
        const fetchEnd = start;
        const fetchStart = fetchEnd - limit || 0;

        const fetchedItems = await this.fetchMore(fetchStart, fetchEnd, limit);
        if (fetchedItems.length < this.listState.value.limit) {
          this._completePrev$.next(true);
        }

        this._listState$.next({ ...this.listState.value, start: fetchStart });
        this._items$.next([...fetchedItems, ...this.items.value]);
      }
    } catch {
      this._error$.next(true);
    }
    finally {
      loading$.next(false);

    }
  }
}
