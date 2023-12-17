import { exists, join } from "../deps.ts";

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
