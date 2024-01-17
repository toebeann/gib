import { booleanRace } from "../utils/booleanRace.js";
import { hasCommonUnityFiles } from "./hasCommonUnityFiles.js";
import { hasCommonUnityString } from "./hasCommonUnityString.js";
import { hasUnityBuildNumber } from "./hasUnityBuildNumber.js";
import { hasUnityPlayerDylib } from "./hasUnityPlayerDylib.js";

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
