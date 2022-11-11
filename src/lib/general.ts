export const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export const mergeById = <T extends { id: string }>(oldItems: T[], newItems: T[]): T[] => {
  const r = [];
  const knownIds = new Set<string>();

  for (const x of oldItems) {
    // assume oldItems are already unique (according to ids)
    knownIds.add(x.id);
    r.push(x);
  }

  for (const x of newItems) {
    if (!knownIds.has(x.id)) {
      knownIds.add(x.id);
      r.push(x);
    }
  }

  // is the order correct?

  return r;
};

export const last = <T>(a: T[] | undefined): T | undefined => a && a[a.length - 1];

/**
 * Throws an Error with the given message.
 *
 * Use to throw an exception from an expression context.
 *
 * Example:
 * ```
 * const value = this.getValue() ?? unreachable(`value must be present at this point`);
 * ```
 */
export const unreachable = (reason?: string): never => {
  throw new Error(reason ?? `unreachable code reached`);
};

export const required = <T>(value: T, reason?: string): asserts value is NonNullable<T> => {
  if (value === null || value === undefined) { unreachable(reason ?? `value is null`); }
};

export const ensure = <T>(value: T | null | undefined): T => {
  if (value === null || value === undefined) {
    throw new Error('value is not defined');
  }
  return value;
};

export const createArray = <T>(length: number, elementCreator: (index: number) => T): T[] =>
  new Array(length).fill(undefined).map((_, i) => elementCreator(i));

export const pushOrCreate = <T>(el: T, arr: T[] | undefined): T[] =>
  [...(arr || []), el];


export const trackById = <T extends { id: string }>(_: number, item: T | any): string | undefined => item?.id;
export const trackByIndex = (index: number): number => index;

export const clamp = (x: number, min: number, max: number): number => Math.min(Math.max(min, x), max);

export const toBase64 = (file: File): Promise<string | ArrayBuffer | null> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });

/** @deprecated */
export const contentObjectToString = (obj: { contentType: string; content: string }): string =>
  `data:${obj.contentType};base64,${obj.content}`;

export const blobToString = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener('load', () => resolve(reader.result as string));
    reader.addEventListener('error', reject);

    reader.readAsDataURL(blob);
  });

export const capitalize = (s: string): string =>
  s.charAt(0).toUpperCase() + s.slice(1);

export const isArrayString = (value: any): value is string[] => Array.isArray(value) && value.every((v) => typeof v === 'string');

export const formatBytesSize = (bytes: number, decimals = 2): string => {
  // Note: I assume that no negative `decimals` value is used
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const unitIndex = Math.floor(Math.log(bytes) / Math.log(1024));
  const dimension = parseFloat((bytes / Math.pow(1024, unitIndex)).toFixed(decimals));
  return `${dimension} ${sizes[unitIndex]}`;
};

export const splitInChunks = <T>(source: T[], chunkSize: number): T[][] =>
  Array.from({ length: Math.ceil(source.length / chunkSize) }, (_, i) =>
    source.slice(i * chunkSize, i * chunkSize + chunkSize),
  );

/**
 * Flattens an array.
 * Copy from https://github.com/angular/angular/blob/master/packages/core/src/util/array_utils.ts
 */
export const flatten = (list: any[], dst?: any[]): any[] => {
  if (dst === undefined) {
    dst = list;
  }

  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    if (Array.isArray(item)) {
      // we need to inline it.
      if (dst === list) {
        // Our assumption that the list was already flat was wrong and
        // we need to clone flat since we need to write to it.
        dst = list.slice(0, i);
      }
      flatten(item, dst);
    } else if (dst !== list) {
      dst.push(item);
    }
  }
  return dst;
};

/**
 * Checks if the input arrays of strings are equal or not
 *
 * @param a First array
 * @param b Second array
 * @returns `true` if `a` and `b` are identical, `false` otherwise
 */
export const stringArrayEqual = (a: string[], b: string[]): boolean => JSON.stringify(a) === JSON.stringify(b);

/**
 * Join only not null or undefined item of array
 *
 * @param items array
 * @param separator string | undefined
 * @returns joined string with only defined values
 */
export const joinIsNotNullOrUndefined = (items: Array<string | undefined>, separator?: string) =>
  items.filter((item): item is string => !!item).join(separator);

/**
 * Convert a FileList to an array of File
 *
 * @param fileList FileList
 * @returns File[]
 */
export const fileListToArray = (fileList: FileList): File[] =>
  createArray(fileList.length, (index) => fileList.item(index)).filter((file): file is File => !!file);
