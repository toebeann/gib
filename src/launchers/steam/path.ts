import { match } from "ts-pattern";
import { getLibraryfoldersPath as getLibraryfoldersPathLinux } from "./linux/path.ts";
import {
  getLibraryfoldersPath as getLibraryfoldersPathMac,
  getLoginUsersPath as getLoginUsersPathMac,
  getSteamPath as getSteamPathMac,
} from "./macos/path.ts";
import {
  getLibraryfoldersPath as getLibraryfoldersPathWin,
  getLoginUsersPath as getLoginUsersPathWin,
  getSteamPath as getSteamPathWin,
} from "./windows/paths.ts";

/** Retrieves the path to the Steam installation. */
export const getSteamPath = match(process.platform)
  .returnType<() => string>()
  .with("darwin", () => getSteamPathMac)
  .with("win32", () => getSteamPathWin)
  .otherwise(() => () => "");

/** Retrieves the path to Steam's `libraryfolders.vdf` file. */
export const getLibraryfoldersPath = match(process.platform)
  .returnType<() => string>()
  .with("linux", () => getLibraryfoldersPathLinux)
  .with("darwin", () => getLibraryfoldersPathMac)
  .with("win32", () => getLibraryfoldersPathWin)
  .otherwise(() => () => "");

/** Retrieves the path to Steam's `loginusers`.vdf` file. */
export const getLoginUsersPath = match(process.platform)
  .returnType<() => string>()
  .with("darwin", () => getLoginUsersPathMac)
  .with("win32", () => getLoginUsersPathWin)
  .otherwise(() => () => "");
