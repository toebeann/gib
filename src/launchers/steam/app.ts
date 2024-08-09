import { join } from "node:path";
import { z } from "zod";
import { toCamelCaseKeys } from "../../zod/toCamelCaseKeys.ts";
import type { App } from "../app.ts";
import type { SteamLauncher } from "./launcher.ts";

/** State flags used in Steam's app manifest files. */
export enum SteamAppState {
  Invalid = 0,
  Uninstalled = 1 << 0,
  UpdateRequired = 1 << 1,
  FullyInstalled = 1 << 2,
  Encrypted = 1 << 3,
  Locked = 1 << 4,
  FilesMissing = 1 << 5,
  AppRunning = 1 << 6,
  FilesCorrupt = 1 << 7,
  UpdateRunning = 1 << 8,
  UpdatePaused = 1 << 9,
  UpdateStarted = 1 << 10,
  Uninstalling = 1 << 11,
  BackupRunning = 1 << 12,
  Reconfiguring = 1 << 13,
  Validating = 1 << 14,
  AddingFiles = 1 << 15,
  Preallocating = 1 << 16,
  Downloading = 1 << 17,
  Staging = 1 << 18,
  Committing = 1 << 19,
  UpdateStopping = 1 << 20,
}

const manifestConfigSchema = toCamelCaseKeys(
  z.object({
    language: z.string().optional(),
    betaKey: z.string().optional(),
  }).passthrough(),
);

/** Zod schema for working with Steam app manifest files. */
export const appManifestSchema = toCamelCaseKeys(
  z.object({
    appState: toCamelCaseKeys(z.object({
      appid: z.number(),
      name: z.string(),
      installdir: z.string(),
      stateFlags: z.number(),
      universe: z.number(),
      lastUpdated: z.number().optional(),
      sizeOnDisk: z.number().optional(),
      stagingSize: z.number().optional(),
      buildid: z.number().optional(),
      lastOwner: z.number().optional(),
      updateResult: z.number().optional(),
      bytesToDownload: z.number().optional(),
      bytesDownloaded: z.number().optional(),
      bytesToStage: z.number().optional(),
      bytesStaged: z.number().optional(),
      targetBuildId: z.number().optional(),
      autoUpdateBehavior: z.number().optional(),
      allowOtherDownloadsWhileRunning: z.number().optional(),
      scheduledAutoUpdate: z.number().optional(),
      sharedDepots: z.record(z.union([z.string(), z.number()])).optional(),
      installedDepots: z.record(
        toCamelCaseKeys(
          z.object({
            manifest: z.number().optional(),
            size: z.number().optional(),
          }).passthrough(),
        ),
      ).optional(),
      stagedDepots: z.record(
        toCamelCaseKeys(
          z.object({
            manifest: z.number().optional(),
            size: z.number().optional(),
            dlcappid: z.number().optional(),
          }).passthrough(),
        ),
      ).optional(),
      dlcDownloads: z.record(
        toCamelCaseKeys(
          z.object({
            bytesDownloaded: z.number().optional(),
            bytesToDownload: z.number().optional(),
          }).passthrough(),
        ),
      ).optional(),
      userConfig: manifestConfigSchema.optional(),
      mountedConfig: manifestConfigSchema.optional(),
    })),
  })
    .passthrough(),
);

/** A parsed Steam app manifest. */
export type SteamAppManifest = z.infer<typeof appManifestSchema>;

/** An abstraction for working with an installed Steam app. */
export class SteamApp implements App<SteamLauncher, SteamAppManifest> {
  /**
   * @param launcher The launcher which manages the app.
   * @param manifest The data manifest the launcher holds about the app.
   * @param manifestPath The path to the manifest on disk.
   * @param [id=manifest.appState.appid.toString()] The Steam app id of the app.
   * @param [name=manifest.appState.name] The display name of the app.
   * @param [path] The path to the folder where the app is installed on disk.
   */
  constructor(
    public readonly launcher: SteamLauncher,
    public readonly manifest: SteamAppManifest,
    manifestPath: string,
    public readonly id = manifest.appState.appid.toString(),
    public readonly name = manifest.appState.name,
    public readonly path = join(
      manifestPath,
      "..",
      "common",
      manifest.appState.installdir,
    ),
  ) {}

  /**
   * Determines whether the app has a given state flag registered in it's Steam
   * app manifest.
   *
   * @param state The state flag to check for.
   */
  hasState = (state: SteamAppState) =>
    (this.manifest.appState.stateFlags & state) === state;

  get fullyInstalled() {
    return this.hasState(SteamAppState.FullyInstalled);
  }

  /**
   * Launches the app with Steam.
   */
  launch = () => this.launcher.launch(this);
}
