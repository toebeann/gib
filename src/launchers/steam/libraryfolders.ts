import { readFile } from "node:fs/promises";

import { parse } from "@node-steam/vdf";

import { caseInsensitiveProxy } from "../../utils/proxy.ts";
import { getLibraryFoldersPath } from "./path.ts";

/** Steam's `libraryfolders.vdf` file, parsed. */
export type LibraryFolders = {
  libraryfolders: Record<string, {
    apps: Record<string, number>;
    path: string;
    label?: string;
    contentid?: number;
    totalsize?: number;
    update_clean_bytes_tally?: number;
    time_last_update_corruption?: number;
  }>;
};

/**
 * Retrieves information about Steam library folders on this computer, parsed
 * from Steam's `libraryfolders.vdf` file.
 */
export const getLibraryFolders = async (path = getLibraryFoldersPath()) => {
  const data = await readFile(path, "utf8");
  return Object.values(
    (new Proxy(parse(data), caseInsensitiveProxy) as LibraryFolders)
      .libraryfolders,
  );
};
