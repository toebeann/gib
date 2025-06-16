import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ID } from "@node-steam/id";
import { parse, stringify } from "@node-steam/vdf";
import { caseInsensitiveProxy } from "../../utils/proxy.ts";
import { getUserConfigFolderPath } from "./loginusers.ts";

/** One of Steam's `localconfig.vdf` files, parsed. */
export type LocalConfig = {
  UserLocalConfigStore: {
    Software: {
      Valve: {
        Steam: {
          apps: Record<string, {
            LastPlayed?: number;
            Playtime2wks?: number;
            Playtime?: number;
            cloud?: { last_sync_state?: string };
            autocloud?: {
              lastlaunch?: number;
              lastexit?: number;
            };
            BadgeData?: string | number;
            LaunchOptions?: string | number;
          }>;
          LastPlayedTimesSyncTime?: number;
          PlayerLevel?: number;
          SmallMode?: 0 | 1;
        };
      };
    };
  };
};

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

  return new Proxy(
    parse(
      await readFile(join(configPath, "localconfig.vdf"), "utf8"),
    ),
    caseInsensitiveProxy,
  ) as LocalConfig;
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
