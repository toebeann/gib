import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ID } from "@node-steam/id";
import { parse } from "@node-steam/vdf";
import { match, P } from "ts-pattern";
import { caseInsensitiveProxy } from "../../utils/proxy.ts";
import { getLoginUsersPath, getSteamPath } from "./path.ts";

type numericBoolean = 0 | 1;

/** Steam's `loginusers.vdf` file, parsed. */
export type LoginUsers = {
  users: Record<string, {
    AccountName: string;
    PersonaName?: string;
    RememberPassword?: numericBoolean;
    WantsOfflineMode?: numericBoolean;
    SkipOfflineModeWarning?: numericBoolean;
    AllowAutoLogin?: numericBoolean;
    MostRecent: numericBoolean;
    Timestamp?: number;
  }>;
};

/**
 * Gets inforation about users who have logged in to Steam on this computer,
 * parsed from Steam's `loginusers.vdf` file.
 */
export const getUsers = () =>
  readFile(
    getLoginUsersPath(),
    "utf8",
  ).then((text) =>
    Object.entries(
      (new Proxy(parse(text), caseInsensitiveProxy) as LoginUsers).users,
    )
  );

/**
 * Retrieves information about the most recent user of Steam on this computer,
 * parsed from Steam's `loginusers.vdf` file.
 */
export const getMostRecentUser = () =>
  getUsers()
    .then((users) =>
      users.find(([_, user]) => user.MostRecent) ?? users[0] ?? []
    );

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
): Promise<string | undefined>;

export async function getUserConfigFolderPath(userId?: ID | string) {
  const { accountid } = await match(userId)
    .returnType<Promise<ID | undefined>>()
    .with(P.instanceOf(ID), (id) => Promise.resolve(id))
    .with(P.string, (id) => Promise.resolve(new ID(id)))
    .otherwise(() =>
      getMostRecentUser()
        .then((user) => user?.[0] && new ID(user?.[0]) || undefined)
    )
    .then((id) => id || { accountid: undefined });

  if (!accountid) return;

  return join(
    getSteamPath(),
    "userdata",
    accountid.toString(),
    "config",
  );
}
