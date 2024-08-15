import { Glob } from "bun";
import { basename, dirname, extname, resolve } from "node:path";

/**
 * Retrieves the paths to the `Info.plist` file for every macOS Application in
 * a given directory, recursively. Also takes into account the case where the
 * distributed Application is missing the '[name].app' wrapping directory.
 *
 * @param path The directory path to look at.
 * @returns An async generator of `string` paths.
 */

export const getApps = async function* (path: string) {
  const resolved = resolve(path);
  const glob = new Glob("**/Info.plist");
  console.log(resolved);
  for await (
    const relativePath of glob.scan({
      onlyFiles: true,
      cwd: resolved,
    })
  ) {
    const plist = resolve(resolved, relativePath);
    if (
      basename(dirname(plist)) === "Contents" &&
      extname(dirname(dirname(plist))) !== ".bundle"
    ) {
      yield plist;
    }
  }
};
