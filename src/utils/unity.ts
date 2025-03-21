import { readFile, stat } from "node:fs/promises";
import { basename, dirname, extname, join, normalize, sep } from "node:path";
import { exists } from "../fs/exists.ts";
import { booleanRace } from "./booleanRace.ts";
import {
  getValue,
  parsePlistFromFile as readPlist,
  search as searchPlists,
} from "./plist.ts";

/**
 * Searches the given `path` for native macOS Unity apps.
 *
 * @param path
 * @param indicators
 */
export const search = async function* (
  path: string,
  indicators?: number,
) {
  const parts = normalize(path).split(sep);
  const index = parts.lastIndexOf("Contents");
  const pathExists = exists(path);
  const isDir = pathExists
    .then((exists) => exists && stat(path).then((stats) => stats.isDirectory()))
    .catch(() => false);
  const searchDir =
    (extname(path) === ".app" || basename(path) === "Contents") && await isDir
      ? path
      : index >= 0
      ? parts.slice(0, index + 1).join(sep)
      : !await pathExists
      ? undefined
      : await isDir
      ? path
      : dirname(path);

  if (!searchDir) return;

  for await (const path of searchPlists(searchDir)) {
    if (await hasUnityAppIndicators(path, indicators)) {
      const plist = await readPlist(path);
      const { CFBundleName, CFBundleExecutable } = plist;
      yield {
        name: CFBundleName,
        bundle: dirname(dirname(path)),
        executable: CFBundleExecutable &&
          join(path, "..", "MacOS", CFBundleExecutable),
        plist,
      };
    }
  }
};

/**
 * Determines whether the macOS Application corresponding with the provided
 * `Info.plist` file contains at least one of several files which are common to
 * Unity games, e.g. `.app/Contents/Resources/Data/globalgamemanagers`.
 *
 * @param plist The path to the `Info.plist` of the macOS Application to check.
 */
export const hasCommonUnityFiles = (plist: string) =>
  booleanRace([
    stat(join(plist, "..", "Data", "boot.config")),
    stat(join(plist, "..", "Resources", "Data", "boot.config")),
    stat(join(plist, "..", "Data", "globalgamemanagers")),
    stat(join(plist, "..", "Resources", "Data", "globalgamemanagers")),
    stat(join(plist, "..", "Data", "resources.assets")),
    stat(join(plist, "..", "Resources", "Data", "resources.assets")),
  ].map((promise) =>
    promise
      .then((stats) => stats.isFile())
      .catch(() => false)
  ));

/**
 * Determines whether the provided `Info.plist` file contains at least one of
 * several strings which are common to Unity games, e.g. `"Unity Player"`.
 *
 * @param plist The path to the `Info.plist` of the macOS Application to check.
 */
export const hasCommonUnityString = async (plist: string) =>
  readFile(plist, "utf8")
    .then((text) =>
      !!text.trim().match(new RegExp("Unity Player|Unity Technologies", "g"))
    );

/**
 * Determines whether the macOS Application corresponding with the provided
 * `Info.plist` file has at least n indicators that it is a Unity app.
 *
 * @param plist The path to the `Info.plist` of the macOS Application to check.
 * @param n The number of indicators required to pass. Defaults to 2.
 */
export const hasUnityAppIndicators = (plist: string, n = 2) =>
  booleanRace(
    [
      hasUnityBuildNumber(plist),
      hasCommonUnityString(plist),
      hasUnityPlayerDylib(plist),
      hasCommonUnityFiles(plist),
    ].map((promise) => promise.catch(() => false)),
    n,
  );

/**
 * Determines whether the provided `Info.plist` file contains a value with the
 * key `UnityBuildNumber`.
 *
 * @param plist The path to the `Info.plist` of the macOS Application to check.
 */
export const hasUnityBuildNumber = async (plist: string) =>
  getValue(plist, "UnityBuildNumber")
    .then(() => true)
    .catch(() => false);

/**
 * Determines whether the macOS Application corresponding with the provided
 * `Info.plist` file contains a `UnityPlayer.dylib` file in its `Frameworks`
 * directory.
 *
 * @param plist The path to the `Info.plist` of the macOS Application to check.
 */
export const hasUnityPlayerDylib = (plist: string) =>
  stat(join(plist, "..", "Frameworks", "UnityPlayer.dylib"))
    .then((stats) => stats.isFile())
    .catch(() => false);
