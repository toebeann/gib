import { match, P } from "../deps.ts";

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
