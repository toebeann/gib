import { access, constants, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";
import { ID } from "@node-steam/id";
import { readVdf, writeVdf } from "steam-binary-vdf";
import { match, P } from "ts-pattern";
import { caseInsensitiveProxy } from "../../utils/proxy.ts";
import { getMostRecentUser } from "./loginusers.ts";
import { getSteamPath } from "./path.ts";

type numericBoolean = 0 | 1;

/** One of Steam's binary `shortcuts.vdf` files, parsed. */
export type Shortcuts = {
  shortcuts: Record<string, {
    appid?: number;
    AppName?: string;
    Exe?: string;
    StartDir?: string;
    icon?: string;
    ShortcutPath?: string;
    LaunchOptions?: string;
    IsHidden?: numericBoolean;
    AllowDesktopConfig?: numericBoolean;
    AllowOverlay?: numericBoolean;
    LastPlayTime?: number;
  }>;
};

/** A Shortcut entry for Steam's binary `shortcuts.vdf` files.s */
export type Shortcut = Shortcuts["shortcuts"][string];

/**
 * Determines the path to the `shortcuts.vdf` file for the most recent user of
 * Steam on this computer.
 */
export function getPath(): Promise<string | undefined>;

/**
 * Determines the path to the `shortcuts.vdf` file for the user matching
 * `userId`.
 *
 * @param userId
 */
export function getPath(userId: ID): Promise<string>;

/**
 * Determines the path to the `shortcuts.vdf` file for the user matching
 * `userId`.
 *
 * @param userId
 */
export function getPath(userId: string): Promise<string>;

/**
 * Determines the path to the `shortcuts.vdf` file for the user matching
 * `userId`, or the most recent user of Steam on this computer if not
 * specified.
 *
 * @param userId
 */
export function getPath(
  userId?: ID | string,
): Promise<string | undefined>;

export async function getPath(userId?: ID | string) {
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
    "shortcuts.vdf",
  );
}

/** Gets the shortcuts for the most recent user of Steam on this computer. */
export function getShortcuts(): Promise<Shortcuts | undefined>;

/**
 * Gets the shortcuts for the Steam user matching `userId`.
 *
 * @param userId
 */
export function getShortcuts(userId: ID): Promise<Shortcuts>;

/**
 * Gets the shortcuts for the Steam user matching `userId`.
 *
 * @param userId
 */
export function getShortcuts(userId: string): Promise<Shortcuts>;

/**
 * Gets the shortcuts for the Steam user matching `userId`, or the most recent
 * user of Steam on this computer if not specified.
 *
 * @param userId
 */
export function getShortcuts(
  userId?: ID | string,
): Promise<Shortcuts | undefined>;

export async function getShortcuts(
  userId?: ID | string,
): Promise<Shortcuts | undefined> {
  const shortcutsPath = await getPath(userId);
  if (!shortcutsPath) return;

  if (
    !await access(shortcutsPath, constants.R_OK)
      .then(() => true)
      .catch(() => false)
  ) return { shortcuts: {} };

  return new Proxy(
    readVdf(await readFile(shortcutsPath)),
    caseInsensitiveProxy,
  ) as Shortcuts;
}

/**
 * Add `shortcut` to `shortcuts`. To save the changes, call `setShortcuts` on
 * the result.
 *
 * @param shortcut
 * @param shortcuts
 */
export const addShortcut = (
  shortcut: Shortcut,
  shortcuts: Shortcuts,
): Shortcuts => {
  const keys = Object.keys(shortcuts.shortcuts);

  shortcuts
    .shortcuts[
      keys.length === 0 ? 0 : Math.max(...keys.map((s) => +s)) + 1
    ] = shortcut;
  return shortcuts;
};

/**
 * Add all shortcuts in `arr` to `shortcuts`. To save the changes, call
 * `setShortcuts` on the result.
 *
 * @param arr
 * @param shortcuts
 */
export const addShortcuts = (
  arr: Shortcut[],
  shortcuts: Shortcuts,
): Shortcuts => arr.reduce((acc, curr) => addShortcut(curr, acc), shortcuts);

/**
 * Sets the shortcuts for the most recent user of Steam on this computer.
 *
 * It is highly advised to:
 * 1. Ensure Steam is not running,
 * 1. Call `getShortcuts` and modify as required, e.g. by calling
 * `addShortcuts`,
 * 1. Finally call `setShortcuts` with the modified shortcuts.
 *
 * @param shortcuts The shortcuts to set. _**Do not construct this by hand**_,
 * as it completely overwrites any shortcuts set for the user.
 */
export function setShortcuts(shortcuts: Shortcuts): Promise<boolean>;

/**
 * Sets the shortcuts for the user matching `userId`.
 *
 * It is highly advised to:
 * 1. Ensure Steam is not running,
 * 1. Call `getShortcuts` and modify as required, e.g. by calling
 * `addShortcuts`,
 * 1. Finally call `setShortcuts` with the modified shortcuts.
 *
 * @param shortcuts The shortcuts to set. _**Do not construct this by hand**_,
 * as it completely overwrites any shortcuts set for the user.
 * @param userId
 */
export function setShortcuts(
  shortcuts: Shortcuts,
  userId: ID,
): Promise<boolean>;

/**
 * Sets the shortcuts for the user matching `userId`.
 *
 * It is highly advised to:
 * 1. Ensure Steam is not running,
 * 1. Call `getShortcuts` and modify as required, e.g. by calling
 * `addShortcuts`,
 * 1. Finally call `setShortcuts` with the modified shortcuts.
 *
 * @param shortcuts The shortcuts to set. _**Do not construct this by hand**_,
 * as it completely overwrites any shortcuts set for the user.
 * @param userId
 */
export function setShortcuts(
  shortcuts: Shortcuts,
  userId: string,
): Promise<boolean>;

/**
 * Sets the shortcuts for the user matching `userId`, or the most recent user
 * of Steam on this computer if not specified.
 *
 * It is highly advised to:
 * 1. Ensure Steam is not running,
 * 1. Call `getShortcuts` and modify as required, e.g. by calling
 * `addShortcuts`,
 * 1. Finally call `setShortcuts` with the modified shortcuts.
 *
 * @param shortcuts The shortcuts to set. _**Do not construct this by hand**_,
 * as it completely overwrites any shortcuts set for the user.
 * @param userId
 */
export function setShortcuts(
  shortcuts: Shortcuts,
  userId?: ID | string,
): Promise<boolean>;

export async function setShortcuts(shortcuts: Shortcuts, userId?: ID | string) {
  const shortcutsPath = await getPath(userId);
  if (!shortcutsPath) return false;

  await writeFile(shortcutsPath, Readable.from(writeVdf(shortcuts)));
  return true;
}
