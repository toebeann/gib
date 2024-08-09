import { exec } from "../fs/exec.ts";

/**
 * Determines whether the provided `Info.plist` file contains at least one of
 * several strings which are common to Unity games, e.g. `"Unity Player"`.
 *
 * @param plist The path to the `Info.plist` of the macOS Application to check.
 */

export const hasCommonUnityString = async (plist: string) =>
  !!(await exec(`plutil -convert json -o - "${plist}"`)).stdout.trim()
    .match(
      new RegExp("Unity Player|Unity Technologies", "g"),
    );
