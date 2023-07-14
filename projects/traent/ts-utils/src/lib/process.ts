import { Observable, ReplaySubject } from 'rxjs';

export class ProcessAbortError extends Error {
  constructor() {
    super('Process aborted');
  }
}

export const prepareProcess = <T, TReturn>(generator: AsyncGenerator<T, TReturn, unknown>, controller?: AbortController) => {
  /* Note: this does not work without an explicit subscription to the `Observable` */
  const stream$ = new ReplaySubject<T>(1);

  const run = async () => {
    while (!controller?.signal?.aborted) {
      const v = await generator.next();
      if (controller?.signal?.aborted) {
        break;
      } else if (v.done) {
        return v.value;
      } else {
        stream$.next(v.value);
      }
    }

    throw new ProcessAbortError();
  };

  const start = () => {
    const promise$ = run();
    promise$.then(() => stream$.complete(), (err) => stream$.error(err));
    return promise$;
  };

  return { stream$: stream$.asObservable(), start };
};

export async function* abortableGenerator<T, TReturn>(gen: AsyncGenerator<T, TReturn, unknown>, signal: AbortSignal) {
  while (!signal.aborted) {
    const v = await gen.next();
    if (!v.done) {
      yield v.value;
    } else if (!signal.aborted) {
      return v.value;
    }
  }

  // pass and ignore a return value to abort the execution of gen
  // this ensures that the finally handlers run
  await gen.return(undefined as any);

  throw new ProcessAbortError();
}

/** From https://github.com/parzh/observable-to-async-generator/blob/main/src/index.ts */
export interface Deferred<Value = unknown> extends Promise<Value> {
  resolve(value?: Value): void;
  reject(error: Error): void;
}

export const defer = <Value>(): Deferred<Value> => {
  const transit = {} as Deferred<Value>;

  const promise = new Promise<Value>(async (resolve, reject) => {
    await Object.assign(transit, { resolve, reject });
  });

  return Object.assign(promise, transit);
};

export async function* observableToAsyncGen<Value>(observable: Observable<Value>): AsyncIterableIterator<Value> {
  let deferred = defer<Value>();
  let finished = false;

  const subscription = observable.subscribe({
    next: (value) => {
      const result = deferred;
      deferred = defer<Value>();
      result.resolve(value);
    },
    error: (error: unknown) => {
      const result = deferred;
      deferred = defer<Value>();
      result.reject(error instanceof Error ? error : new Error(String(error)));
    },
    complete: () => {
      finished = true;
      deferred.resolve();
    },
  });

  try {
    while (true) {
      const value = await deferred;

      if (finished) {
        break;
      }

      yield value;
    }
  }

  finally {
    subscription.unsubscribe();
  }
}
