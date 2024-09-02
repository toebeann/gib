import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ID } from "@node-steam/id";
import { parse, stringify } from "@node-steam/vdf";
import { z } from "zod";
import { getUserConfigFolderPath } from "./loginusers.ts";

/** Zod schema for working with Steam's `localconfig.vdf` files. */
export const localConfigSchema = z.object({
  UserLocalConfigStore: z.object({
    Software: z.object({
      Valve: z.object({
        Steam: z.object({
          apps: z.record(
            z.object({
              /** @type {number | undefined} */
              LastPlayed: z.unknown().optional(),
              /** @type {number | undefined} */
              Playtime2wks: z.unknown().optional(),
              /** @type {number | undefined} */
              Playtime: z.unknown().optional(),
              cloud: z.object({
                /** @type {string | undefined} */
                last_sync_state: z.unknown().optional(),
              }).passthrough().or(z.unknown()).optional(),
              autocloud: z.object({
                /** @type {number | undefined} */
                lastlaunch: z.unknown().optional(),
                /** @type {number | undefined} */
                lastexit: z.unknown().optional(),
              }).passthrough().or(z.unknown()).optional(),
              /** @type {string | number | undefined} */
              BadgeData: z.unknown().optional(),
              /** @type {string | number | undefined} */
              LaunchOptions: z.unknown().optional(),
            }).passthrough(),
          ),
          /** @type {number | undefined} */
          LastPlayedTimesSyncTime: z.unknown().optional(),
          /** @type {number | undefined} */
          PlayerLevel: z.unknown().optional(),
          /** @type {0 | 1 | undefined} */
          SmallMode: z.unknown().optional(),
        }).passthrough(),
      }).passthrough(),
    }).passthrough(),
  }).passthrough(),
});

/** One of Steam's `localconfig.vdf` files, parsed. */
export type LocalConfig = z.infer<typeof localConfigSchema>;

/**
 * Gets local config information for the most recent user of Steam on this
 * computer.
 *
 * Returns `undefined` if no user has logged in to Steam on this computer.
 */
export function getLocalConfig(): Promise<LocalConfig | undefined>;

/**
 * Gets local config information for Steam user matching `userId`.
 *
 * @param userId
 */
export function getLocalConfig(userId: ID): Promise<LocalConfig>;

/**
 * Gets local config information for Steam user matching `userId`.
 *
 * @param userId
 */
export function getLocalConfig(userId: string): Promise<LocalConfig>;

/**
 * Gets local config information for Steam user matching `userId`. Looks up the
 * most recent user of Steam on this computer if none specified.
 *
 * Returns `undefined` if no user has logged in to Steam on this computer.
 *
 * @param userId
 */
export function getLocalConfig(
  userId?: ID | string,
): Promise<LocalConfig | undefined>;

export async function getLocalConfig(userId?: ID | string) {
  const configPath = await getUserConfigFolderPath(userId);
  if (!configPath) return;

  return localConfigSchema.parse(
    parse(
      await readFile(join(configPath, "localconfig.vdf"), "utf8"),
    ),
  );
}

/**
 * Sets local config information for the most recent user of Steam on this
 * computer.
 *
 * It is highly advised to:
 * 1. Ensure Steam is not running,
 * 1. Call `getLocalConfig` and modify as required,
 * 1. Finally, call `setLocalConfig` with the modified config.
 *
 * @param config The config to set. _**Do not construct this by hand**_, as it
 * completely overwrites any config data already set for the user.
 */
export function setLocalConfig(config: LocalConfig): Promise<void>;

/**
 * Sets local config information for Steam user matching `userId`.
 *
 * It is highly advised to:
 * 1. Ensure Steam is not running,
 * 1. Call `getLocalConfig` and modify as required,
 * 1. Finally, call `setLocalConfig` with the modified config.
 *
 * @param config The config to set. _**Do not construct this by hand**_, as it
 * completely overwrites any config data already set for the user.
 * @param userId
 */
export function setLocalConfig(
  config: LocalConfig,
  userId: ID,
): Promise<void>;

/**
 * Sets local config information for Steam user matching `userId`.
 *
 * It is highly advised to:
 * 1. Ensure Steam is not running,
 * 1. Call `getLocalConfig` and modify as required,
 * 1. Finally, call `setLocalConfig` with the modified config.
 *
 * @param config The config to set. _**Do not construct this by hand**_, as it
 * completely overwrites any config data already set for the user.
 * @param userId
 */
export function setLocalConfig(
  config: LocalConfig,
  userId: string,
): Promise<void>;

/**
 * Sets local config information for Steam user matching `userId`. Looks up the
 * most recent user of Steam on this computer if none specified.
 *
 * It is highly advised to:
 * 1. Ensure Steam is not running,
 * 1. Call `getLocalConfig` and modify as required,
 * 1. Finally, call `setLocalConfig` with the modified config.
 *
 * @param config The config to set. _**Do not construct this by hand**_, as it
 * completely overwrites any config data already set for the user.
 * @param userId
 */
export function setLocalConfig(
  config: LocalConfig,
  userId?: ID | string,
): Promise<void>;

export async function setLocalConfig(
  config: LocalConfig,
  userId?: ID | string,
) {
  const configPath = await getUserConfigFolderPath(userId);
  if (!configPath) return;

  await writeFile(
    join(configPath, "localconfig.vdf"),
    stringify(config),
    "utf8",
  );
}
