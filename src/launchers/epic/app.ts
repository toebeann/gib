import { z } from "zod";
import { toCamelCaseKeys } from "../../zod/toCamelCaseKeys.ts";
import type { App } from "../app.ts";
import type { EpicGamesLauncher } from "./launcher.ts";

/**
 * Zod schema for working with the Epic Games Launcher's
 * `LauncherInstalled.dat` file.
 */
export const launcherInstalledSchema = toCamelCaseKeys(
  z.object({
    installationList: toCamelCaseKeys(
      z.object({
        installLocation: z.string(),
        namespaceId: z.string().optional(),
        itemId: z.string().optional(),
        artifactId: z.string().optional(),
        appVersion: z.string().optional(),
        appName: z.string(),
      }).passthrough(),
    ).array(),
  }).passthrough(),
);

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
export type EpicGamesAppManifest =
  & z.infer<typeof launcherInstalledSchema>["installationList"][number]
  & z.infer<typeof appManifestSchema>;

/** An abstraction for working with an installed Epic Games Launcher app. */
export class EpicGamesApp
  implements App<EpicGamesLauncher, EpicGamesAppManifest> {
  /**
   * @param launcher The launcher which manages the app.
   * @param manifest The data manifest the launcher holds about the app.
   * @param [id=manifest.artifactId ?? manifest.appName] The ArtifactId or
   * AppName of the app.
   * @param [name=manifest.displayName] The DisplayName of the app.
   * @param [path=manifest.installLocation] The InstallLocation of the app.
   * @param [fullyInstalled=manifest.bIsIncompleteInstall !== true] Whether the
   * app is fully installed.
   */
  constructor(
    public launcher: EpicGamesLauncher,
    public manifest: EpicGamesAppManifest,
    public id = manifest.artifactId ?? manifest.appName,
    public name = manifest.displayName,
    public path = manifest.installLocation,
    public fullyInstalled = manifest.bIsIncompleteInstall !== true,
  ) {}

  /**
   * Parses the manifest to construct a id string used to launch the app.
   */
  get launchId() {
    return [
      this.manifest.NamespaceId ?? this.manifest.CatalogNamespace,
      this.manifest.ItemId ?? this.manifest.CatalogItemId,
      this.manifest.ArtifactId ?? this.manifest.AppName,
    ]
      .filter(Boolean)
      .join(":");
  }

  /** Launches the app with the Epic Games Launcher. */
  launch = () => this.launcher.launch(this);
}
