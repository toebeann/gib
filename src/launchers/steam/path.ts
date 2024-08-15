import { match } from "ts-pattern";
import { getLibraryFoldersPath as getLibraryFoldersPathLinux } from "./linux/path.ts";
import {
  getLibraryFoldersPath as getLibraryFoldersPathMac,
  getLoginUsersPath as getLoginUsersPathMac,
  getSteamPath as getSteamPathMac,
} from "./macos/path.ts";
import {
  getLibraryFoldersPath as getLibraryFoldersPathWin,
  getLoginUsersPath as getLoginUsersPathWin,
  getSteamPath as getSteamPathWin,
} from "./windows/path.ts";

/** Retrieves the path to the Steam installation. */
export const getSteamPath = match(process.platform)
  .returnType<() => string>()
  .with("darwin", () => getSteamPathMac)
  .with("win32", () => getSteamPathWin)
  .otherwise(() => () => "");

/** Retrieves the path to Steam's `libraryfolders.vdf` file. */
export const getLibraryFoldersPath = match(process.platform)
  .returnType<() => string>()
  .with("linux", () => getLibraryFoldersPathLinux)
  .with("darwin", () => getLibraryFoldersPathMac)
  .with("win32", () => getLibraryFoldersPathWin)
  .otherwise(() => () => "");

/** Retrieves the path to Steam's `loginusers`.vdf` file. */
export const getLoginUsersPath = match(process.platform)
  .returnType<() => string>()
  .with("darwin", () => getLoginUsersPathMac)
  .with("win32", () => getLoginUsersPathWin)
  .otherwise(() => () => "");
