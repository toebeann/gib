import { env, file } from "bun";

import { homedir } from "node:os";
import { platform } from "node:os" with { type: "macro" };
import { dirname, join } from "node:path";

import { ID } from "@node-steam/id";

import { getProtocolHandlerPath } from "../../utils/protocolHandler";
import { getMostRecentUser } from "./loginusers";

/** Default Steam data folder path. */
export const DEFAULT_DATA_FOLDER_PATH = platform() === "darwin"
  ? join(homedir(), "Library", "Application Support", "Steam")
  : platform() === "win32"
  ? join(env["PROGRAMFILES(X86)"] ?? env.PROGRAMFILES ?? homedir(), "Steam")
  : platform() === "linux"
  ? join(homedir(), ".steam", "root")
  : "";

/** Retrieves the path to the Steam's data folder path'. */
export const getDataFolderPath = async () => {
  if (platform() === "win32") {
    try {
      const path = await getProtocolHandlerPath("steam");
      if (path && await file(path).exists()) return dirname(path);
    } catch {}
  }

  return DEFAULT_DATA_FOLDER_PATH;
};

/** Retrieves the path to Steam's executable path. */
export const getExecutablePath = async () =>
  await getProtocolHandlerPath("steam");

/** Retrieves the path to Steam's `libraryfolders.vdf` file. */
export const getLibraryFoldersPath = async (
  dataPath: string | Promise<string> = getDataFolderPath(),
) => join(await dataPath, "config", "libraryfolders.vdf");

/** Retrieves the path to Steam's `loginusers`.vdf` file. */
export const getLoginUsersPath = async (
  dataPath: string | Promise<string> = getDataFolderPath(),
) => join(await dataPath, "config", "loginusers.vdf");

/**
 * Attempts to determine the path to the `config` folder for the most recent
 * user of Steam on this computer. Returns `undefined` if no users have logged
 * in to Steam on this computer.
 *
 * @returns The path to the `config` folder for the most recent user of Steam
 * on this computer, or `undefined` if a user could not be found.
 */
export function getUserConfigFolderPath(): Promise<string | undefined>;

/**
 * Determines the path to the `config` folder for the Steam user matching
 * `userId`.
 *
 * @param userId ID of the Steam user.
 */
export function getUserConfigFolderPath(userId: ID): Promise<string>;

/***
 * Determines the path to the `config` folder for the Steam user with id
 * `userId`.
 *
 * @param userId ID of the Steam user.
 */
export function getUserConfigFolderPath(userId: string): Promise<string>;

/**
 * Determines the path to the `config` folder for a Steam user on this
 * computer.
 *
 * @param userId ID of the steam user. If not specified, will attempt to look
 * up the most recent user of Steam on this computer.
 *
 * @returns The path to the `config` folder for the relevant user, or
 * `undefined` if `userId` not specified and a user of Steam on this computer
 * could not be found.
 */
export function getUserConfigFolderPath(
  userId?: ID | string,
  dataPath?: string | Promise<string>,
): Promise<string | undefined>;

export async function getUserConfigFolderPath(
  userId?: ID | string,
  dataPath: string | Promise<string> = getDataFolderPath(),
) {
  const { accountid } = userId instanceof ID
    ? userId
    : typeof userId === "string"
    ? new ID(userId)
    : await getMostRecentUser()
      .then((user) =>
        user?.[0] && new ID(user?.[0]) || { accountid: undefined }
      );
  if (!accountid) return;

  return join(await dataPath, "userdata", accountid.toString(), "config");
}
