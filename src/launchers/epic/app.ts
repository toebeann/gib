import { z } from "zod";
import type { App } from "../app.js";
import type { EpicGamesLauncher } from "./launcher.js";

/**
 * Zod schema for working with the Epic Games Launcher's
 * `LauncherInstalled.dat` file.
 */
export const launcherInstalledSchema = z.object({
  InstallationList: z.object({
    InstallLocation: z.string(),
    NamespaceId: z.string().optional(),
    ItemId: z.string().optional(),
    ArtifactId: z.string().optional(),
    AppVersion: z.string().optional(),
    AppName: z.string(),
  }).passthrough().array(),
}).passthrough();

/** Zod schema for working with Epic Games Launcher app manifest files. */
export const appManifestSchema = z.object({
  FormatVersion: z.number(),
  bIsIncompleteInstall: z.boolean().optional(),
  LaunchCommand: z.string().optional(),
  LaunchExecutable: z.string().optional(),
  ManifestLocation: z.string().optional(),
  ManifestHash: z.string().optional(),
  bIsApplication: z.boolean().optional(),
  bIsExecutable: z.boolean().optional(),
  bIsManaged: z.boolean().optional(),
  bNeedsValidation: z.boolean().optional(),
  bRequiresAuth: z.boolean().optional(),
  bAllowMultipleInstances: z.boolean().optional(),
  bCanRunOffline: z.boolean().optional(),
  bAllowUriCmdArgs: z.boolean().optional(),
  bLaunchElevated: z.boolean().optional(),
  BaseURLs: z.string().array().optional(),
  BuildLabel: z.string().optional(),
  AppCategories: z.string().array().optional(),
  ChunkDbs: z.unknown().array().optional(),
  CompatibleApps: z.unknown().array().optional(),
  DisplayName: z.string(),
  InstallationGuid: z.string().optional(),
  InstallLocation: z.string(),
  InstallSessionId: z.string().optional(),
  InstallTags: z.unknown().array().optional(),
  InstallComponents: z.unknown().array().optional(),
  HostInstallationGuid: z.string().optional(),
  PrereqIds: z.unknown().array().optional(),
  PrereqSHA1Hash: z.string().optional(),
  LastPrereqSucceededSHA1Hash: z.string().optional(),
  StagingLocation: z.string().optional(),
  TechnicalType: z.string().optional(),
  VaultThumbnailUrl: z.string().optional(),
  VaultTitleText: z.string().optional(),
  InstallSize: z.number().optional(),
  MainWindowProcessName: z.string().optional(),
  ProcessNames: z.unknown().array().optional(),
  BackgroundProcessNames: z.unknown().array().optional(),
  IgnoredProcessNames: z.unknown().array().optional(),
  DlcProcessNames: z.unknown().array().optional(),
  MandatoryAppFolderName: z.string().optional(),
  OwnershipToken: z.string().optional(),
  CatalogNamespace: z.string(),
  CatalogItemId: z.string(),
  AppName: z.string(),
  AppVersionString: z.string().optional(),
  MainGameCatalogNamespace: z.string().optional(),
  MainGameCatalogItemId: z.string().optional(),
  MainGameAppName: z.string().optional(),
  AllowedUriEnvVars: z.unknown().array().optional(),
}).passthrough();

/** A parsed Epic Games Launcher app manifest. */
export type EpicGamesAppManifest =
  & z.infer<typeof launcherInstalledSchema>["InstallationList"][number]
  & z.infer<typeof appManifestSchema>;

/** An abstraction for working with an installed Epic Games Launcher app. */
export class EpicGamesApp
  implements App<EpicGamesLauncher, EpicGamesAppManifest> {
  /**
   * @param launcher The launcher which manages the app.
   * @param manifest The data manifest the launcher holds about the app.
   * @param [id=manifest.ArtifactId ?? manifest.AppName] The ArtifactId or
   * AppName of the app.
   * @param [name=manifest.DisplayName] The DisplayName of the app.
   * @param [path=manifest.InstallLocation] The InstallLocation of the app.
   * @param [fullyInstalled=manifest.bIsIncompleteInstall !== true] Whether the
   * app is fully installed.
   */
  constructor(
    public launcher: EpicGamesLauncher,
    public manifest: EpicGamesAppManifest,
    public id = manifest.ArtifactId ?? manifest.AppName,
    public name = manifest.DisplayName,
    public path = manifest.InstallLocation,
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
