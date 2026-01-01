import { ID } from "@node-steam/id";
import { addSlashes, removeSlashes } from "slashes";

import { type App, getAppById } from "./app.ts";
import { getLocalConfig, setLocalConfig } from "./localconfig.ts";
import { quit } from "./process.ts";

/**
 * Gets app launch options for the most recent user of Steam on this computer.
 *
 * Returns `undefined` if no user has logged in to Steam on this computer, or
 * if the no launch options for the specified app were found.
 *
 * @param app
 */
export function getLaunchOptions(app: App): Promise<string | undefined>;

/**
 * Gets app launch options for the most recent user of Steam on this computer.
 *
 * Returns `undefined` if no user has logged in to Steam on this computer, or
 * if the no launch options for the specified app were found.
 *
 * @param app
 */
export function getLaunchOptions(appId: string): Promise<string | undefined>;

/**
 * Gets app launch options for the Steam user matching `userId`.
 *
 * Returns `undefined` if no launch options for the specified app were found.
 *
 * @param app
 * @param userId
 */
export function getLaunchOptions(
  app: App,
  userId: ID,
): Promise<string | undefined>;

/**
 * Gets app launch options for the Steam user matching `userId`.
 *
 * Returns `undefined` if no launch options for the specified app were found.
 *
 * @param app
 * @param userId
 */
export function getLaunchOptions(
  app: App,
  userId: string,
): Promise<string | undefined>;

/**
 * Gets app launch options for the Steam user matching `userId`, or the most
 * recent user of Steam on this computer if not specified.
 *
 * @param app
 * @param userId
 */
export function getLaunchOptions(
  app: App,
  userId?: ID | string,
): Promise<string | undefined>;

/**
 * Gets app launch options for the Steam user matching `userId`.
 *
 * Returns `undefined` if no launch options for the specified app were found.
 *
 * @param appId
 * @param userId
 */
export function getLaunchOptions(
  appId: string,
  userId: ID,
): Promise<string | undefined>;

/**
 * Gets app launch options for the Steam user matching `userId`.
 *
 * Returns `undefined` if no launch options for the specified app were found.
 *
 * @param appId
 * @param userId
 */
export function getLaunchOptions(
  appId: string,
  userId: string,
): Promise<string | undefined>;

/**
 * Gets app launch options for the Steam user matching `userId`, or the most
 * recent user of Steam on this computer if not specified.
 *
 * @param appId
 * @param userId
 */
export function getLaunchOptions(
  appId: string,
  userId?: ID | string,
): Promise<string | undefined>;

/**
 * Gets app launch options for the Steam user matching `userId`, or the most
 * recent user of Steam on this computer if not specified.
 *
 * @param app
 * @param userId
 */
export function getLaunchOptions(
  app: App | string,
  userId?: ID | string,
): Promise<string | undefined>;

export async function getLaunchOptions(
  app: App | string,
  userId?: ID | string,
) {
  const resolved = typeof app === "string" ? await getAppById(app) : app;
  if (!resolved) return;

  const config = await getLocalConfig(userId);
  if (!config) return;

  const {
    UserLocalConfigStore: { Software: { Valve: { Steam: { apps } } } },
  } = config;
  if (!apps) return;

  const launchOptions = Object.entries(apps).find(([id]) => resolved.id === id)
    ?.[1]
    ?.LaunchOptions;
  if (!launchOptions) return;

  return removeSlashes(launchOptions.toString());
}

/**
 * Sets app launch options for the most recent user of Steam on this computer.
 *
 * This operation will terminate any running Steam processes.
 *
 * @param app
 * @param launchOptions
 */
export function setLaunchOptions(
  app: App,
  launchOptions: string,
): Promise<boolean>;

/**
 * Sets app launch options for the most recent user of Steam on this computer.
 *
 * This operation will terminate any running Steam processes.
 *
 * @param appId
 * @param launchOptions
 */
export function setLaunchOptions(
  appId: string,
  launchOptions: string,
): Promise<boolean>;

/**
 * Sets app launch options for the Steam user matching `userId`.
 *
 * This operation will terminate any running Steam processes.
 *
 * @param app
 * @param launchOptions
 * @param userId
 */
export function setLaunchOptions(
  app: App,
  launchOptions: string,
  userId: ID,
): Promise<boolean>;

/**
 * Sets app launch options for the Steam user matching `userId`.
 *
 * This operation will terminate any running Steam processes.
 *
 * @param app
 * @param launchOptions
 * @param userId
 */
export function setLaunchOptions(
  app: App,
  launchOptions: string,
  userId: string,
): Promise<boolean>;

/**
 * Sets app launch options for the Steam user matching `userId`.
 *
 * This operation will terminate any running Steam processes.
 *
 * @param appId
 * @param launchOptions
 * @param userId
 */
export function setLaunchOptions(
  appId: string,
  launchOptions: string,
  userId: ID,
): Promise<boolean>;

/**
 * Sets app launch options for the Steam user matching `userId`.
 *
 * This operation will terminate any running Steam processes.
 *
 * @param appId
 * @param launchOptions
 * @param userId
 */
export function setLaunchOptions(
  appId: string,
  launchOptions: string,
  userId: string,
): Promise<boolean>;

/**
 * Sets app launch options for the Steam user matching `userId`, or the most
 * recent user of Steam on this computer if not specified.
 *
 * This operation will terminate any running Steam processes.
 *
 * @param appId
 * @param launchOptions
 * @param userId
 */
export async function setLaunchOptions(
  app: App | string,
  launchOptions: string,
  userId?: ID | string,
): Promise<boolean>;

export async function setLaunchOptions(
  app: App | string,
  launchOptions: string,
  userId?: ID | string,
) {
  const resolved = typeof app === "string" ? await getAppById(app) : app;
  if (!resolved) return false;

  const config = await getLocalConfig(userId);
  if (!config) return false;

  if (!await quit()) return false;

  if (!config.UserLocalConfigStore.Software.Valve.Steam.apps[resolved.id]) {
    return false;
  }

  config.UserLocalConfigStore.Software.Valve.Steam.apps[resolved.id]
    .LaunchOptions = addSlashes(launchOptions);

  await setLocalConfig(config, userId);
  return true;
}
