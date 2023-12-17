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
