import { exists, join, match, P } from "./deps.ts";
import { booleanRace } from "./util.ts";

/**
 * Determines whether the macOS Application corresponding with the provided
 * `Info.plist` file contains a `UnityPlayer.dylib` file in its `Frameworks`
 * directory.
 *
 * @param plist The path to the `Info.plist` of the macOS Application to check.
 */
export const hasUnityPlayerDylib = (plist: string) =>
  exists(join(plist, "..", "Frameworks", "UnityPlayer.dylib"), {
    isFile: true,
  });

/**
 * Determines whether the macOS Application corresponding with the provided
 * `Info.plist` file contains at least one of several files which are common to
 * Unity games, e.g. `.app/Contents/Resources/Data/globalgamemanagers`.
 *
 * @param plist The path to the `Info.plist` of the macOS Application to check.
 */
export const hasCommonUnityFiles = (plist: string) =>
  booleanRace([
    exists(join(plist, "..", "Data", "boot.config"), { isFile: true }),
    exists(join(plist, "..", "Resources", "Data", "boot.config"), {
      isFile: true,
    }),
    exists(join(plist, "..", "Data", "globalgamemanagers"), { isFile: true }),
    exists(join(plist, "..", "Resources", "Data", "globalgamemanagers"), {
      isFile: true,
    }),
    exists(join(plist, "..", "Data", "resources.assets"), { isFile: true }),
    exists(join(plist, "..", "Resources", "Data", "resources.assets"), {
      isFile: true,
    }),
  ]);

/**
 * Determines whether the provided `Info.plist` file contains a value with the
 * key `UnityBuildNumber`.
 *
 * Requires `allow-run=plutil` permission.
 *
 * @param plist The path to the `Info.plist` of the macOS Application to check.
 */
export const hasUnityBuildNumber = async (plist: string) =>
  (await new Deno.Command("plutil", {
    args: ["-extract", "UnityBuildNumber", "raw", "-o", "-", plist],
  }).output()).success;

/**
 * Determines whether the provided `Info.plist` file contains at least one of
 * several strings which are common to Unity games, e.g. `"Unity Player"`.
 *
 * Requires `allow-run=plutil` permission.
 *
 * @param plist The path to the `Info.plist` of the macOS Application to check.
 */
export const hasCommonUnityString = async (plist: string) =>
  match(
    await new Deno.Command("plutil", {
      args: ["-convert", "json", "-o", "-", plist],
    }).output(),
  )
    .returnType<boolean>()
    .with({ success: true, stdout: P.select() }, (stdout) =>
      !!new TextDecoder()
        .decode(stdout)
        .match(
          new RegExp("Unity Player|Unity Technologies", "g"),
        ))
    .otherwise(() => false);

/**
 * Determines whether the macOS Application corresponding with the provided
 * `Info.plist` file has at least n indicators that it is a Unity app.
 *
 * Requires `allow-run=plutil` permission.
 *
 * @param plist The path to the `Info.plist` of the macOS Application to check.
 * @param n The number of indicators required to pass. Defaults to 2.
 */
export const hasUnityAppIndicators = (plist: string, n = 2) =>
  booleanRace([
    hasUnityBuildNumber(plist),
    hasCommonUnityString(plist),
    hasUnityPlayerDylib(plist),
    hasCommonUnityFiles(plist),
  ], n);
