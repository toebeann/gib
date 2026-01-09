import { file } from "bun";

import { join } from "node:path";

import { booleanRace } from "../utils/booleanRace";
import { getValue } from "../utils/plist";

/**
 * Determines whether the macOS Application corresponding with the provided
 * `Info.plist` file contains at least one of several files which are common to
 * Unity games, e.g. `.app/Contents/Resources/Data/globalgamemanagers`.
 *
 * @param plist The path to the `Info.plist` of the macOS Application to check.
 */
export const hasCommonUnityFiles = (plist: string) =>
  booleanRace([
    file(join(plist, "..", "Data", "boot.config")).stat(),
    file(join(plist, "..", "Resources", "Data", "boot.config")).stat(),
    file(join(plist, "..", "Data", "globalgamemanagers")).stat(),
    file(join(plist, "..", "Resources", "Data", "globalgamemanagers")).stat(),
    file(join(plist, "..", "Data", "resources.assets")).stat(),
    file(join(plist, "..", "Resources", "Data", "resources.assets")).stat(),
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
export const hasCommonUnityString = async (plist: string) => {
  const text = await file(plist).text();
  return !!text.trim().match(
    new RegExp("Unity Player|Unity Technologies", "g"),
  );
};

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
  file(join(plist, "..", "Frameworks", "UnityPlayer.dylib")).stat()
    .then((stats) => stats.isFile())
    .catch(() => false);
