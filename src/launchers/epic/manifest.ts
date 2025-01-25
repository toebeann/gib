import { basename, join } from "node:path";
import { readFile } from "node:fs/promises";
import { Glob } from "glob";
import { z } from "zod";
import { toCamelCaseKeys } from "../../utils/zod.ts";
import { getAppDataPath } from "./path.ts";
import type { launcherInstalledSchema } from "./launcherInstalled.ts";

/** Zod schema for working with Epic Games Launcher app manifest files. */
export const appManifestSchema = toCamelCaseKeys(
  z.object({
    formatVersion: z.number(),
    /** @type {boolean | undefined} */
    bIsIncompleteInstall: z.unknown().optional(),
    /** @type {string | undefined} */
    launchCommand: z.unknown().optional(),
    /** @type {string | undefined} */
    launchExecutable: z.unknown().optional(),
    /** @type {string | undefined} */
    manifestLocation: z.unknown().optional(),
    /** @type {string | undefined} */
    manifestHash: z.unknown().optional(),
    /** @type {boolean | undefined} */
    bIsApplication: z.unknown().optional(),
    /** @type {boolean | undefined} */
    bIsExecutable: z.unknown().optional(),
    /** @type {boolean | undefined} */
    bIsManaged: z.unknown().optional(),
    /** @type {boolean | undefined} */
    bNeedsValidation: z.unknown().optional(),
    /** @type {boolean | undefined} */
    bRequiresAuth: z.unknown().optional(),
    /** @type {boolean | undefined} */
    bAllowMultipleInstances: z.unknown().optional(),
    /** @type {boolean | undefined} */
    bCanRunOffline: z.unknown().optional(),
    /** @type {boolean | undefined} */
    bAllowUriCmdArgs: z.unknown().optional(),
    /** @type {boolean | undefined} */
    bLaunchElevated: z.unknown().optional(),
    /** @type {string[] | undefined} */
    baseUrLs: z.unknown().optional(),
    /** @type {string | undefined} */
    buildLabel: z.unknown().optional(),
    /** @type {string[] | undefined} */
    appCategories: z.unknown().optional(),
    /** @type {unknown[] | undefined} */
    chunkDbs: z.unknown().optional(),
    /** @type {unknown[] | undefined} */
    compatibleApps: z.unknown().optional(),
    displayName: z.string(),
    /** @type {string | undefined} */
    installationGuid: z.unknown().optional(),
    installLocation: z.string(),
    /** @type {string | undefined} */
    installSessionId: z.unknown().optional(),
    /** @type {unknown[] | undefined} */
    installTags: z.unknown().optional(),
    /** @type {unknown[] | undefined} */
    installComponents: z.unknown().optional(),
    /** @type {string | undefined} */
    hostInstallationGuid: z.unknown().optional(),
    /** @type {unknown[] | undefined} */
    prereqIds: z.unknown().optional(),
    /** @type {string | undefined} */
    prereqSha1Hash: z.unknown().optional(),
    /** @type {string | undefined} */
    lastPrereqSucceededSha1Hash: z.unknown().optional(),
    /** @type {string | undefined} */
    stagingLocation: z.unknown().optional(),
    /** @type {string | undefined} */
    technicalType: z.unknown().optional(),
    /** @type {string | undefined} */
    vaultThumbnailUrl: z.unknown().optional(),
    /** @type {string | undefined} */
    vaultTitleText: z.unknown().optional(),
    /** @type {number | undefined} */
    installSize: z.unknown().optional(),
    /** @type {string | undefined} */
    mainWindowProcessName: z.unknown().optional(),
    /** @type {unknown[] | undefined} */
    processNames: z.unknown().optional(),
    /** @type {unknown[] | undefined} */
    backgroundProcessNames: z.unknown().optional(),
    /** @type {unknown[] | undefined} */
    ignoredProcessNames: z.unknown().optional(),
    /** @type {unknown[] | undefined} */
    dlcProcessNames: z.unknown().optional(),
    /** @type {string | undefined} */
    mandatoryAppFolderName: z.unknown().optional(),
    /** @type {string | undefined} */
    ownershipToken: z.unknown().optional(),
    catalogNamespace: z.string(),
    catalogItemId: z.string(),
    appName: z.string(),
    /** @type {string | undefined} */
    appVersionString: z.unknown().optional(),
    /** @type {string | undefined} */
    mainGameCatalogNamespace: z.unknown().optional(),
    /** @type {string | undefined} */
    mainGameCatalogItemId: z.unknown().optional(),
    /** @type {string | undefined} */
    mainGameAppName: z.unknown().optional(),
    /** @type {unknown[] | undefined} */
    allowedUriEnvVars: z.unknown().optional(),
  }).passthrough(),
);

/** A parsed Epic Games Launcher app manifest. */
export type AppManifest =
  & z.infer<typeof launcherInstalledSchema>["installationList"][number]
  & z.infer<typeof appManifestSchema>;

/**
 * Gets information about Epic Games Launcher apps installed on this
 * computer, parsed from its `${InstallationGuid}.item` manifest files.
 */
export async function* getManifests() {
  const glob = new Glob("*.item", {
    absolute: true,
    nodir: true,
    cwd: join(getAppDataPath(), "Manifests"),
  });
  for await (const path of glob) {
    yield appManifestSchema.parse(
      JSON.parse(
        await readFile(path, "utf8"),
      ),
    );
  }
}

/**
 * Gets information about an installed Epic Games Launcher app, parsed from
 * its `${InstallationGuid}.item` manifest file.
 *
 * Resolves `undefined` if a manifest with a matching id cannot be found.
 *
 * @param id The ArtifactId or AppName of the app.
 */
export const getManifestById = async (id: string) => {
  for await (const manifest of getManifests()) {
    if (manifest.appName == id) return manifest;
  }
};

/**
 * Gets information about an installed Epic Games Launcher app, parsed from
 * its `${InstallationGuid}.item` manifest file.
 *
 * Resolves `undefined` if a manifest with a matching path cannot be found.
 *
 * @param path The InstallLocation of the app.
 */
export const getManifestByPath = async (path: string) => {
  for await (const manifest of getManifests()) {
    if (manifest.installLocation === path) return manifest;
  }
};
