import { exec } from "../fs/exec.ts";

/**
 * Determines whether the provided `Info.plist` file contains a value with the
 * key `UnityBuildNumber`.
 *
 * @param plist The path to the `Info.plist` of the macOS Application to check.
 */

export const hasUnityBuildNumber = async (plist: string) => {
  try {
    await exec(`plutil -extract UnityBuildNumber raw -o - "${plist}"`);
    return true;
  } catch {
    return false;
  }
};
