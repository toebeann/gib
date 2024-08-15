import { merge as _merge } from "ix/asynciterable";

export const merge = <T>([first, ...rest]: AsyncIterable<T>[]) =>
  _merge(first, ...rest);
