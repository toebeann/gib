import { Glob } from "glob";

/**
 * Retrieves the paths to the `Info.plist` file for every macOS Application in
 * a given directory, recursively. Also takes into account the case where the
 * distributed Application is missing the '[name].app' wrapping directory.
 *
 * @param path The directory path to look at.
 * @returns An async generator of `string` paths.
 */

export const getApps = async function* (path: string) {
  for await (
    const plist of new Glob("/**/Info.plist", {
      absolute: true,
      ignore: "/**/*.bundle/**/Info.plist",
      nodirs: true,
      root: path,
    })
  ) {
    yield plist;
  }
};
