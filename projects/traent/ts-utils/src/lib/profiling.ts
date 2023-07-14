// This file is intentionally aimed at collecting additional information and
// making it available. It is meant to be used mostly/only in development
// environments. For this reason, some information is logged to the `console`.

/* eslint-disable no-console */

export const measureFunction = <T>(context: string, original: T): T => {
  if (typeof original !== 'function') {
    console.warn(`Cannot profile`, original);
    return original;
  }

  return function (this: unknown) {
    const start = performance.now();
    const measure = (measureName: string) => (result?: unknown) => {
      performance.measure(measureName, { start });
      return result;
    };
    const value = original.apply(this, arguments);

    if (isThenable(value)) {
      return value.then(measure(`${context} then`), measure(`${context} catch`));
    } else if (isAsyncGenerator(value)) {
      const gen: AsyncGenerator = {
        next: () => value.next(arguments),
        throw: () => value.throw(arguments).finally(measure(`${context} throw`)),
        return: () => value.return(arguments).finally(measure(`${context} return`)),
        [Symbol.asyncIterator]: () => gen,
      };
      return gen;
    } else {
      return measure(context)(value);
    }
  } as any;
}

const isNonNullObject = (target: unknown): target is any =>
  target !== null && typeof target === 'object';

const isThenable = (target: unknown): target is PromiseLike<unknown> =>
  isNonNullObject(target) && typeof target.then === 'function';

const isAsyncGenerator = (target: unknown): target is AsyncGenerator =>
  isNonNullObject(target) &&
  typeof target[Symbol.asyncIterator] === 'function' &&
  typeof target.next === 'function' &&
  typeof target.return === 'function' &&
  typeof target.throw === 'function';

export const Profile = (context?: string): MethodDecorator => (target, propertyKey, descriptor) => {
  if (typeof descriptor.value === 'function') {
    const key = `${context ?? target.constructor.name}.${propertyKey.toString()}`;
    console.info(`Tracing ${key}`, target, propertyKey, descriptor);
    descriptor.value = measureFunction(key, descriptor.value);
  } else {
    console.error(`Cannot trace`, target, propertyKey, descriptor);
  }
};

export const ProfileClass = (context?: string): ClassDecorator => (constructor) => {
  context ??= constructor.name;
  console.groupCollapsed(`Instrumenting ${context}`);
  Reflect.ownKeys(constructor.prototype).forEach((propertyKey) => {
    const descriptor = Reflect.getOwnPropertyDescriptor(constructor.prototype, propertyKey);
    if (descriptor && typeof descriptor.value === 'function') {
      const key = `${context ?? constructor.name}.${propertyKey.toString()}`;
      console.info(`Tracing ${key}`);
      Reflect.set(constructor.prototype, propertyKey, measureFunction(key, descriptor.value));
    } else {
      console.warn(`Skipping tracing of ${propertyKey.toString()}`);
    }
  });
  console.groupEnd();
};
