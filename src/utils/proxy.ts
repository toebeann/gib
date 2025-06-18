import { isProxy } from "node:util/types";
import isPlainObject from "lodash.isplainobject";

export const caseInsensitiveProxy = {
  has(target: object, prop: PropertyKey) {
    if (typeof prop === "string") {
      return Reflect.ownKeys(target)
        .some((key) =>
          typeof key === "string" &&
          key.toLowerCase() === prop.toLowerCase()
        );
    }
    // @ts-expect-error
    return Reflect.has(...arguments);
  },
  get(target: object, prop: PropertyKey, receiver?: unknown) {
    if (typeof prop === "string") {
      const key = Reflect.ownKeys(target)
        .find((key) =>
          typeof key === "string" &&
          key.toLowerCase() === prop.toLowerCase()
        );
      if (key) {
        const toProxy = (x: unknown): unknown =>
          isPlainObject(x) && !isProxy(x)
            ? new Proxy(x as object, caseInsensitiveProxy)
            : Array.isArray(x)
            ? x.map((y) => toProxy(y))
            : x;

        return toProxy(Reflect.get(target, key, receiver));
      }
    }
    // @ts-expect-error
    const value = Reflect.get(...arguments);
    return isPlainObject(value) && !isProxy(value)
      ? new Proxy(value, caseInsensitiveProxy)
      : value;
  },
  set(
    target: object,
    prop: PropertyKey,
    value: unknown,
    receiver?: unknown,
  ) {
    if (typeof prop === "string") {
      const key = Reflect.ownKeys(target)
        .find((key) =>
          typeof key === "string" &&
          key.toLowerCase() === prop.toLowerCase()
        );
      if (key) {
        return Reflect.set(target, key, value, receiver);
      }
    }
    // @ts-expect-error
    return Reflect.set(...arguments);
  },
};
