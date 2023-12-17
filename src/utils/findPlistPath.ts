import {
  basename,
  dirname,
  exists,
  extname,
  join,
  match,
  P,
  resolve,
} from "../deps.ts";

export const plistBasename = "Info.plist";
export const plistDirname = "Contents";

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
