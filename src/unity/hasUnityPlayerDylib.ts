import { stat } from "node:fs/promises";
import { join } from "node:path";

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
