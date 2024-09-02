import { readFile } from "node:fs/promises";
import { toCamelCaseKeys } from "../../utils/zod.ts";
import { z } from "zod";
import { join } from "node:path";
import { getAppDataPath } from "./path.ts";

/**
 * Zod schema for working with the Epic Games Launcher's
 * `LauncherInstalled.dat` file.
 */
export const launcherInstalledSchema = toCamelCaseKeys(
  z.object({
    installationList: toCamelCaseKeys(
      z.object({
        installLocation: z.string(),
        /** @type {string | undefined} */
        namespaceId: z.unknown().optional(),
        /** @type {string | undefined} */
        itemId: z.unknown().optional(),
        /** @type {string | undefined} */
        artifactId: z.unknown().optional(),
        /** @type {string | undefined} */
        appVersion: z.unknown().optional(),
        appName: z.string(),
      }).passthrough(),
    ).array(),
  }).passthrough(),
);

/**
 * Gets information about Epic Games Launcher apps installed on this
 * computer, parsed from its `LauncherInstalled.dat` file.
 */
export const getLauncherInstalled = async () =>
  launcherInstalledSchema.parse(JSON.parse(
    await readFile(
      join(
        getAppDataPath(),
        "..",
        "..",
        "UnrealEngineLauncher",
        "LauncherInstalled.dat",
      ),
      "utf8",
    ),
  )).installationList;
