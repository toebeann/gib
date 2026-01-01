import { homedir } from "node:os";
import { join } from "node:path";
import { platform } from "node:process";

/** Retrieves the path to the Steam installation. */
export const getSteamPath = () => {
  if (platform === "darwin") {
    return join(
      homedir(),
      "Library",
      "Application Support",
      "Steam",
    );
  }
  return "";
};

/** Retrieves the path to Steam's `libraryfolders.vdf` file. */
export const getLibraryFoldersPath = () => {
  if (platform === "darwin") {
    return join(
      getSteamPath(),
      "config",
      "libraryfolders.vdf",
    );
  }
  return "";
};

/** Retrieves the path to Steam's `loginusers`.vdf` file. */
export const getLoginUsersPath = () => {
  if (platform === "darwin") {
    return join(getSteamPath() ?? homedir(), "config", "loginusers.vdf");
  }
  return "";
};
