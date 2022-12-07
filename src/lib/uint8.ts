import { decode, encode } from 'base64-arraybuffer';

export const emptyU8 = new Uint8Array();

export const base64ToU8 = (s: string) => new Uint8Array(decode(s));
export const u8ToBase64 = (b: any) => typeof b === 'string' ? b : encode(b);
export const u8ToBlob = (uint8Array: Uint8Array | null | undefined) => uint8Array && new Blob([uint8Array]);
export const u8ToBase64Url = (b: any) => b64ToB64UrlEncoding(u8ToBase64(b));

const textDecoder = new TextDecoder();
// b: DotNet.InputByteArray
export const u8ToRaw = (b: any) =>
  typeof b === 'string'
    ? textDecoder.decode(base64ToU8(b))
    : textDecoder.decode(b);

export const hexToU8 = (s: string) => {
  if (s.length % 2) {
    throw new Error('Expected string to be an even number of characters');
  }

  const r = new Uint8Array(s.length / 2);

  for (let i = 0; i < s.length; i += 2) {
    r[i / 2] = parseInt(s.substring(i, i + 2), 16);
  }

  return r;
};

const u8NumberToHex = (x: number) => {
  const hex = x.toString(16);
  const padded = hex.length < 2 ? `0${hex}` : hex;
  return padded;
};

// b: DotNet.InputByteArray
export const u8ToHex = (b: any) => {
  if (typeof b === 'string') {
    b = base64ToU8(b);
  }

  let r = '';

  for (const x of b) {
    r += u8NumberToHex(x);
  }

  return r;
};

export const b64ToB64UrlEncoding = (s: string): string => s
  .replace(/=/g, '')
  .replace(/\+/g, '-')
  .replace(/\//g, '_');

export const b64UrlToB64Encoding = (s: string): string => s
  .replace(/-/g, '+')
  .replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
