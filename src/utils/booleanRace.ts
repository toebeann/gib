/**
 * Creates a Promise that resolves true when a threshold (n) of the provided
 * Promises resolve true, resolves false when they all resolve otherwise, or
 * rejects when any of the provided Promises reject.
 *
 * @param values An array of boolean Promises.
 * @param n The number of provided Promises which must resolve true for the new
 * Promise to resolve true. Defaults to 1. Clamps to the length of the values
 * array.
 * @returns A new Promise.
 */

export const booleanRace = <T>(values: Promise<T>[], n = 1) => {
  let i = 0;
  return Promise.race(
    (values.map((promise) =>
      new Promise<T>((resolve, reject) =>
        promise
          .then((v) => !!v && ++i >= Math.min(n, values.length) && resolve(v))
          .catch(reject)
      )
    ) as (Promise<T> | Promise<false>)[])
      .concat(Promise.all(values).then(() => false as const)),
  );
};
