import {
  basename,
  dirname,
  exists,
  extname,
  join,
  match,
  P,
  resolve,
} from "./deps.ts";

const plistBasename = "Info.plist";
const plistDirname = "Contents";

/**
 * Attempts to find the path to the `Info.plist` file of a macOS Application.
 *
 * Requires `allow-read` permission.
 *
 * @param path The path to search in.
 * @returns The absolute path to the `Info.plist` file if found, otherwise
 * `undefined`
 */
export const findPlistPath = (
  path: string,
): Promise<string | void> =>
  match([resolve(path), basename(dirname(path)), basename(path)])
    .returnType<Promise<string | void>>()
    .with(
      [P._, plistDirname, plistBasename],
      ([p]) => exists(p, { isFile: true, isReadable: true }),
      ([p]) => Deno.realPath(p),
    )
    .with(
      [P._, P._, plistDirname],
      async ([p]) =>
        (await findPlistPath(join(p, plistBasename))) ??
          findPlistPath(join(p, "..")),
    )
    .with(
      [P._, P._, P.when((base) => extname(base.toLowerCase()) === ".app")],
      ([p]) => findPlistPath(join(p, plistDirname)),
    )
    .otherwise(() => Promise.resolve());

/**
 * Retrieves the paths to the `Info.plist` file for every macOS Application in
 * a given directory. Also takes into account the case where the distributed
 * Application is missing the '[name].app' wrapping directory.
 *
 * Requires `allow-read` permission.
 *
 * @param path The directory path to look at.
 * @returns An async generator of `string` paths.
 */
export const getApps = async function* (path: string) {
  for await (const entry of Deno.readDir(path)) {
    if (
      entry.isFile ||
      (extname(entry.name.toLowerCase()) !== ".app" &&
        entry.name !== "Contents") ||
      (entry.isSymlink &&
        !await exists(join(path, entry.name), {
          isDirectory: true,
          isReadable: true,
        }))
    ) continue;

    const plist = await findPlistPath(join(path, entry.name));
    if (plist) yield plist;
  }
};

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
export const booleanRace = (values: Promise<boolean>[], n = 1) => {
  let i = 0;
  return Promise.race([
    ...values.map((p) =>
      new Promise<boolean>((resolve, reject) =>
        p.then(
          (v) => v && ++i >= Math.min(n, values.length) && resolve(true),
          reject,
        )
      )
    ),
    Promise.all(values).then(() => false),
  ]);
};
