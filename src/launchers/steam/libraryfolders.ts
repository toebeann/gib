import { readFile } from "node:fs/promises";
import { parse } from "@node-steam/vdf";
import { z } from "zod";
import { getLibraryFoldersPath } from "./path.ts";

/** Zod schema for working with Steam's `libraryfolders.vdf` file. */
export const libraryFoldersSchema = z.object({
  libraryfolders: z.record(
    z.object({
      apps: z.record(z.number()),
      path: z.string(),
      /** @type {string | undefined} */
      label: z.unknown().optional(),
      /** @type {number | undefined} */
      contentid: z.unknown().optional(),
      /** @type {number | undefined} */
      totalsize: z.unknown().optional(),
      /** @type {number | undefined} */
      update_clean_bytes_tally: z.unknown().optional(),
      /** @type {number | undefined} */
      time_last_update_corruption: z.unknown().optional(),
    }).passthrough(),
  ),
});

/** Steam's `libraryfolders.vdf` file, parsed. */
export type LibraryFolders = z.infer<typeof libraryFoldersSchema>;

/**
 * Retrieves information about Steam library folders on this computer, parsed
 * from Steam's `libraryfolders.vdf` file.
 */
export const getLibraryFolders = async (path = getLibraryFoldersPath()) => {
  const data = await readFile(path, "utf8");
  return Object.values(libraryFoldersSchema.parse(parse(data)).libraryfolders);
};
