import { booleanRace } from "../utils/booleanRace.ts";
import { hasCommonUnityFiles } from "./hasCommonUnityFiles.ts";
import { hasCommonUnityString } from "./hasCommonUnityString.ts";
import { hasUnityBuildNumber } from "./hasUnityBuildNumber.ts";
import { hasUnityPlayerDylib } from "./hasUnityPlayerDylib.ts";

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
