import { match } from "ts-pattern";
import {
  getLibraryFoldersPath as getLibraryFoldersPathMac,
  getLoginUsersPath as getLoginUsersPathMac,
  getSteamPath as getSteamPathMac,
} from "./macos/path.ts";

/** Retrieves the path to the Steam installation. */
export const getSteamPath = match(process.platform)
  .returnType<() => string>()
  .with("darwin", () => getSteamPathMac)
  .otherwise(() => () => "");

/** Retrieves the path to Steam's `libraryfolders.vdf` file. */
export const getLibraryFoldersPath = match(process.platform)
  .returnType<() => string>()
  .with("darwin", () => getLibraryFoldersPathMac)
  .otherwise(() => () => "");

/** Retrieves the path to Steam's `loginusers`.vdf` file. */
export const getLoginUsersPath = match(process.platform)
  .returnType<() => string>()
  .with("darwin", () => getLoginUsersPathMac)
  .otherwise(() => () => "");
