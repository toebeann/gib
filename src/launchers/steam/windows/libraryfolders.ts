import { join } from "node:path";
import { getSteamPath } from "./getSteamPath.ts";

/** Retrieves the path to Steam's `libraryfolders.vdf` file. */
export const getLibraryfoldersPath = () =>
  join(getSteamPath(), "steamapps", "libraryfolders.vdf");
