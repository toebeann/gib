import { Glob } from "bun";
import { readFile as _readFile } from "node:fs/promises";
import { basename, dirname, extname, resolve } from "node:path";
import { parse, type PlistValue } from "plist";
import { z } from "zod";

const plistStrictSchema = z.object({
  CFBundleName: z.string().optional(),
  CFBundleExecutable: z.string().optional(),
  UnityBuildNumber: z.unknown().optional(),
  CFBundleShortVersionString: z.string().optional(),
  CFBundleGetInfoString: z.string().optional(),
  CFBundleIconFile: z.string().optional(),
});
type PlistStrict = z.infer<typeof plistStrictSchema>;

/** Zod schema for working with macOS Unity app Info.plist files. */
export const plistSchema = plistStrictSchema.passthrough();

/** A parsed macOS Unity app Info.plist. */
export type Plist = z.infer<typeof plistSchema>;

type Key = keyof PlistStrict | (string & {});

/**
 * Retrieves the paths to the `Info.plist` file for every macOS Application in
 * a given directory, recursively. Also takes into account the case where the
 * distributed Application is missing the '[name].app' wrapping directory.
 *
 * @param path The directory path to look at.
 * @returns An async generator of `string` paths.
 */
export const search = async function* (path: string) {
  const resolved = resolve(path);
  const glob = new Glob("**/Info.plist");
  for await (
    const relPath of glob.scan({
      onlyFiles: true,
      cwd: resolved,
    })
  ) {
    const plist = resolve(resolved, relPath);
    if (
      basename(dirname(plist)) === "Contents" &&
      new Set([".app", ""]).has(extname(dirname(dirname(plist))))
    ) {
      yield plist;
    }
  }
};

/**
 * Parses the plist file at `path` and returns it.
 *
 * @param path The path to an `Info.plist` file to parse.
 */
export const parsePlistFromFile = (path: string) =>
  _readFile(path, "utf8")
    .then((text) => plistSchema.parse(parse(text)));

/**
 * Retrieves a value from the plist file at `path` with given `key`.
 *
 * @param path The path to an `Info.plist` file to parse.
 * @param key The key to look up in the `Info.plist` file.
 *
 * @returns A string representation of the value in the plist file matching
 * `key`, or `undefined` if no matching key was found.
 */
export const getValue = (path: string, key: Key) =>
  parsePlistFromFile(path)
    .then((plist) => plist[key] as PlistValue)
    .catch(() => undefined);
