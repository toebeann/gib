import { file } from "bun";

import { parse } from "@node-steam/vdf";

import { caseInsensitiveProxy } from "../../utils/proxy.ts";
import { getLoginUsersPath } from "./path.ts";

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
export const getUsers = async (
  path: string | Promise<string> = getLoginUsersPath(),
) => {
  const text = await file(await path).text();
  return Object.entries(
    (new Proxy(parse(text), caseInsensitiveProxy) as LoginUsers).users,
  );
};

/**
 * Retrieves information about the most recent user of Steam on this computer,
 * parsed from Steam's `loginusers.vdf` file.
 */
export const getMostRecentUser = async () => {
  const users = await getUsers();
  return users.find(([_, user]) => user.MostRecent) ?? users[0] ?? [];
};
