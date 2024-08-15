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
    bIsIncompleteInstall: z.boolean().optional(),
    launchCommand: z.string().optional(),
    launchExecutable: z.string().optional(),
    manifestLocation: z.string().optional(),
    manifestHash: z.string().optional(),
    bIsApplication: z.boolean().optional(),
    bIsExecutable: z.boolean().optional(),
    bIsManaged: z.boolean().optional(),
    bNeedsValidation: z.boolean().optional(),
    bRequiresAuth: z.boolean().optional(),
    bAllowMultipleInstances: z.boolean().optional(),
    bCanRunOffline: z.boolean().optional(),
    bAllowUriCmdArgs: z.boolean().optional(),
    bLaunchElevated: z.boolean().optional(),
    baseUrLs: z.string().array().optional(),
    buildLabel: z.string().optional(),
    appCategories: z.string().array().optional(),
    chunkDbs: z.unknown().array().optional(),
    compatibleApps: z.unknown().array().optional(),
    displayName: z.string(),
    installationGuid: z.string().optional(),
    installLocation: z.string(),
    installSessionId: z.string().optional(),
    installTags: z.unknown().array().optional(),
    installComponents: z.unknown().array().optional(),
    hostInstallationGuid: z.string().optional(),
    prereqIds: z.unknown().array().optional(),
    prereqSha1Hash: z.string().optional(),
    lastPrereqSucceededSha1Hash: z.string().optional(),
    stagingLocation: z.string().optional(),
    technicalType: z.string().optional(),
    vaultThumbnailUrl: z.string().optional(),
    vaultTitleText: z.string().optional(),
    installSize: z.number().optional(),
    mainWindowProcessName: z.string().optional(),
    processNames: z.unknown().array().optional(),
    backgroundProcessNames: z.unknown().array().optional(),
    ignoredProcessNames: z.unknown().array().optional(),
    dlcProcessNames: z.unknown().array().optional(),
    mandatoryAppFolderName: z.string().optional(),
    ownershipToken: z.string().optional(),
    catalogNamespace: z.string(),
    catalogItemId: z.string(),
    appName: z.string(),
    appVersionString: z.string().optional(),
    mainGameCatalogNamespace: z.string().optional(),
    mainGameCatalogItemId: z.string().optional(),
    mainGameAppName: z.string().optional(),
    allowedUriEnvVars: z.unknown().array().optional(),
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
  for await (
    const path of new Glob("/*.item", {
      absolute: true,
      nodir: true,
      root: join(getAppDataPath(), "Manifests"),
    })
  ) {
    yield appManifestSchema.parse(
      JSON.parse(
        await readFile(path, { encoding: "utf8" }),
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

/**
 * Gets information about an installed Epic Games Launcher app, parsed from
 * its `${InstallationGuid}.item` manifest file.
 *
 * Resolves `undefined` if a matching manifest cannot be found.
 *
 * @param idOrPath The ArtifactId, AppName or InstallLocation of the app.
 */
export const getManifest = (idOrPath: string) =>
  basename(idOrPath) === idOrPath
    ? getManifestById(idOrPath)
    : getManifestByPath(idOrPath);
