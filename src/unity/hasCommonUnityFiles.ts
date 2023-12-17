import { exists, join } from "../deps.ts";
import { booleanRace } from "../utils/booleanRace.ts";

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
