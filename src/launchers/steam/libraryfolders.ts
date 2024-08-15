import { readFile } from "node:fs/promises";
import { parse } from "@node-steam/vdf";
import { match } from "ts-pattern";
import { z } from "zod";
import { getLibraryfoldersPath as linux } from "./linux/libraryfolders.ts";
import { getLibraryfoldersPath as mac } from "./macos/libraryfolders.ts";
import { getLibraryfoldersPath as win } from "./windows/libraryfolders.ts";

/** Zod schema for working with Steam's `libraryfolders.vdf` file. */
export const libraryfoldersSchema = z.object({
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
export type LibraryFolders = z.infer<typeof libraryfoldersSchema>;

/** Retrieves the path to Steam's `libraryfolders.vdf` file. */
export const getLibraryfoldersPath = match(process.platform)
  .returnType<() => string>()
  .with("linux", () => linux)
  .with("darwin", () => mac)
  .with("win32", () => win)
  .otherwise(() => () => "");

export const getLibraryfolders = () =>
  readFile(
    getLibraryfoldersPath(),
    { encoding: "utf8" },
  ).then((text) =>
    Object.values(libraryfoldersSchema.parse(parse(text)).libraryfolders)
  );
