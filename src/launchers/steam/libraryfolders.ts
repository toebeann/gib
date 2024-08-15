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
      label: z.string().optional(),
      contentid: z.number().optional(),
      totalsize: z.number().optional(),
      update_clean_bytes_tally: z.number().optional(),
      time_last_update_corruption: z.number().optional(),
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
  const data = await readFile(path, { encoding: "utf8" });
  return Object.values(libraryFoldersSchema.parse(parse(data)).libraryfolders);
};
