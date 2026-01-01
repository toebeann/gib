import { platform } from "node:process";

import {
  getLibraryFoldersPath as getLibraryFoldersPathMac,
  getLoginUsersPath as getLoginUsersPathMac,
  getSteamPath as getSteamPathMac,
} from "./macos/path.ts";

/** Retrieves the path to the Steam installation. */
export const getSteamPath = () => {
  if (platform === "darwin") return getSteamPathMac();
  return "";
};

/** Retrieves the path to Steam's `libraryfolders.vdf` file. */
export const getLibraryFoldersPath = () => {
  if (platform === "darwin") return getLibraryFoldersPathMac();
  return "";
};

/** Retrieves the path to Steam's `loginusers`.vdf` file. */
export const getLoginUsersPath = () => {
  if (platform === "darwin") return getLoginUsersPathMac();
  return "";
};
