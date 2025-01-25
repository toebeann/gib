import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ID } from "@node-steam/id";
import { parse } from "@node-steam/vdf";
import { match, P } from "ts-pattern";
import { z } from "zod";
import { getLoginUsersPath, getSteamPath } from "./path.ts";

/** Zod schema for working with Steam's `loginusers.vdf` file. */
export const loginusersSchema = z.object({
  users: z.record(
    z.object({
      AccountName: z.string(),
      /** @type {string | undefined} */
      PersonaName: z.unknown().optional(),
      /** @type {0 | 1 | undefined} */
      RememberPassword: z.unknown().optional(),
      /** @type {0 | 1 | undefined} */
      WantsOfflineMode: z.unknown().optional(),
      /** @type {0 | 1 | undefined} */
      SkipOfflineModeWarning: z.unknown().optional(),
      /** @type {0 | 1 | undefined} */
      AllowAutoLogin: z.unknown().optional(),
      /** @type {boolean} */
      MostRecent: z.coerce.boolean(),
      /** @type {number | undefined} */
      Timestamp: z.unknown().optional(),
    }).passthrough(),
  ),
});

/** Steam's `loginusers.vdf` file, parsed. */
export type LoginUsers = z.infer<typeof loginusersSchema>;

/**
 * Gets inforation about users who have logged in to Steam on this computer,
 * parsed from Steam's `loginusers.vdf` file.
 */
export const getUsers = () =>
  readFile(
    getLoginUsersPath(),
    "utf8",
  ).then((text) => Object.entries(loginusersSchema.parse(parse(text)).users));

/**
 * Retrieves information about the most recent user of Steam on this computer,
 * parsed from Steam's `loginusers.vdf` file.
 */
export const getMostRecentUser = () =>
  getUsers()
    .then((users) => users.find(([_, user]) => user.MostRecent) ?? []);

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
