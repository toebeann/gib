import untildify from "untildify";

import { exists } from "../fs/exists.ts";

/**
 * Attempts to handle path discrepancies between pasting a pathname or file,
 * or dragging a file directly into the terminal and return the correct path.
 * @param path 
 * @returns A valid, existing path, or `undefined` if could not resolve.
 */
export const getFixedPath = async (path: string) => {
  path = untildify(path);
  if (await exists(path)) return path;
  else if (process.platform !== "win32") {
    const unescaped = path
      .split("\\\\")
      .map((s) => s.replaceAll("\\", ""))
      .join("\\");

    if (await exists(unescaped)) return unescaped;
  }
};
