import { exists, extname, join } from "../deps.ts";
import { findPlistPath } from "./findPlistPath.ts";

/**
 * Retrieves the paths to the `Info.plist` file for every macOS Application in
 * a given directory. Also takes into account the case where the distributed
 * Application is missing the '[name].app' wrapping directory.
 *
 * Requires `allow-read` permission.
 *
 * @param path The directory path to look at.
 * @returns An async generator of `string` paths.
 */

export const getApps = async function* (path: string) {
  for await (const entry of Deno.readDir(path)) {
    if (
      entry.isFile ||
      (extname(entry.name.toLowerCase()) !== ".app" &&
        entry.name !== "Contents") ||
      (entry.isSymlink &&
        !await exists(join(path, entry.name), {
          isDirectory: true,
          isReadable: true,
        }))
    ) continue;

    const plist = await findPlistPath(join(path, entry.name));
    if (plist) yield plist;
  }
};
