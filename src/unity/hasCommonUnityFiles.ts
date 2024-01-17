import { stat } from "node:fs/promises";
import { join } from "node:path";
import { booleanRace } from "../utils/booleanRace.js";

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
