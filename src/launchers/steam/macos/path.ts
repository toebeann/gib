import { homedir } from "node:os";
import { join } from "node:path";

/** Retrieves the path to the Steam installation. */
export const getSteamPath = () =>
  join(
    homedir(),
    "Library",
    "Application Support",
    "Steam",
  );

/** Retrieves the path to Steam's `libraryfolders.vdf` file. */
export const getLibraryfoldersPath = () =>
  join(
    getSteamPath(),
    "config",
    "libraryfolders.vdf",
  );

/** Retrieves the path to Steam's `loginusers`.vdf` file. */
export const getLoginUsersPath = () =>
  join(getSteamPath() ?? homedir(), "config", "loginusers.vdf");
