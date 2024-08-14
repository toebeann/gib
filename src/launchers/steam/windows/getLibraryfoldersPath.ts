import { join } from "node:path";
import { getSteamPath } from "./getSteamPath.ts";

export const getLibraryfoldersPath = () =>
  join(getSteamPath(), "steamapps", "libraryfolders.vdf");
