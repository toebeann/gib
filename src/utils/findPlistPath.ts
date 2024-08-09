import { access, constants, realpath, stat } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";
import { booleanRace } from "./booleanRace.ts";

export const plistBasename = "Info.plist";
export const plistDirname = "Contents";

/**
 * Attempts to find the path to the `Info.plist` file of a macOS Application.
 *
 * @param path The path to search in.
 * @returns The absolute path to the `Info.plist` file if found, otherwise
 * `undefined`
 */

export const findPlistPath = async (
  path: string,
): Promise<string | void> => {
  const resolved = resolve(path);
  const dir = basename(dirname(resolved));
  const base = basename(resolved);

  if (
    dir === plistDirname &&
    base === plistBasename &&
    await booleanRace([
      access(resolved, constants.R_OK).then(() => true).catch(() => false),
      stat(resolved).then((stats) => stats.isFile()).catch(() => false),
    ])
  ) {
    return realpath(resolved);
  } else if (base === plistDirname) {
    return await findPlistPath(join(resolved, plistBasename)) ??
      findPlistPath(join(resolved, ".."));
  } else if (extname(base.toLowerCase()) === ".app") {
    return findPlistPath(join(resolved, plistDirname, plistBasename));
  }
};
