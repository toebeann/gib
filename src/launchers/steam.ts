import {
  basename,
  extname,
  homedir,
  join,
  match,
  P,
  parseVdf,
  z,
} from "../deps.ts";
import { booleanRace } from "../utils/booleanRace.ts";
import { isProtocolHandlerRegistered } from "../utils/isProtocolHandlerRegistered.ts";
import { App, Launcher } from "./mod.ts";

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

const manifestConfigSchema = z.object({
  language: z.string().optional(),
  BetaKey: z.string().optional(),
});

/** Zod schema for working with Steam app manifest files. */
export const appManifestSchema = z.object({
  AppState: z.object({
    appid: z.number(),
    name: z.string(),
    installdir: z.string(),
    StateFlags: z.number(),
    universe: z.number(),
    LastUpdated: z.number().optional(),
    SizeOnDisk: z.number().optional(),
    StagingSize: z.number().optional(),
    buildid: z.number().optional(),
    LastOwner: z.number().optional(),
    UpdateResult: z.number().optional(),
    BytesToDownload: z.number().optional(),
    BytesDownloaded: z.number().optional(),
    BytesToStage: z.number().optional(),
    BytesStaged: z.number().optional(),
    TargetBuildID: z.number().optional(),
    AutoUpdateBehavior: z.number().optional(),
    AllowOtherDownloadsWhileRunning: z.number().optional(),
    ScheduledAutoUpdate: z.number().optional(),
    SharedDepots: z.record(z.union([z.string(), z.number()])).optional(),
    InstalledDepots: z.record(
      z.object({
        manifest: z.number().optional(),
        size: z.number().optional(),
      }).passthrough(),
    ).optional(),
    StagedDepots: z.record(
      z.object({
        manifest: z.number().optional(),
        size: z.number().optional(),
        dlcappid: z.number().optional(),
      }).passthrough(),
    ).optional(),
    DlcDownloads: z.record(
      z.object({
        BytesDownloaded: z.number().optional(),
        BytesToDownload: z.number().optional(),
      }).passthrough(),
    ).optional(),
    UserConfig: manifestConfigSchema.passthrough().optional(),
    MountedConfig: manifestConfigSchema.passthrough().optional(),
  }),
}).passthrough();

/** A parsed Steam app manifest. */
export type SteamAppManifest = z.infer<typeof appManifestSchema>;

/** An abstraction for working with an installed Steam app. */
export class SteamApp implements App<SteamLauncher, SteamAppManifest> {
  /**
   * @param launcher The launcher which manages the app.
   * @param manifest The data manifest the launcher holds about the app.
   * @param manifestPath The path to the manifest on disk.
   * @param [id=manifest.AppState.appid.toString()] The Steam app id of the app.
   * @param [name=manifest.AppState.name] The display name of the app.
   * @param [path] The path to the folder where the app is installed on disk.
   */
  constructor(
    public readonly launcher: SteamLauncher,
    public readonly manifest: SteamAppManifest,
    manifestPath: string,
    public readonly id = manifest.AppState.appid.toString(),
    public readonly name = manifest.AppState.name,
    public readonly path = join(
      manifestPath,
      "..",
      "common",
      manifest.AppState.installdir,
    ),
  ) {}

  /**
   * Determines whether the app has a given state flag registered in it's Steam
   * app manifest.
   *
   * @param state The state flag to check for.
   */
  hasState = (state: SteamAppState) =>
    (this.manifest.AppState.StateFlags & state) === state;

  get fullyInstalled() {
    return this.hasState(SteamAppState.FullyInstalled);
  }

  /**
   * Launches the app with Steam.
   *
   * Requires `allow-run=open` permission.
   */
  launch = () => this.launcher.launch(this);
}

/** Zod schema for working with Steam's `libraryfolders.vdf` file. */
export const libraryfoldersSchema = z.object({
  libraryfolders: z.record(
    z.object({
      apps: z.record(z.number()),
      path: z.string(),
      label: z.string().optional(),
      contentid: z.number().optional(),
      totalsize: z.number().optional(),
      update_clean_bytes_tally: z.number().optional(),
      time_last_update_corruption: z.number().optional(),
    }).passthrough(),
  ),
});

/** Steam's `libraryfolders.vdf` file, parsed. */
export type SteamLibraryFolders = z.infer<typeof libraryfoldersSchema>;

/** An abstraction for working with Steam and its apps. */
export class SteamLauncher implements Launcher<SteamAppManifest> {
  readonly name = "Steam";

  /**
   * Gets information about Steam Library folders on this computer, parsed from
   * Steam's `libraryfolders.vdf` file.
   *
   * Requires permmissions:
   * - `allow-env=HOME`
   * - `allow-read="$HOME/Library/Application
   *    Support/Steam/config/libraryfolders.vdf"`
   */
  private getLibraryfolders = () =>
    Deno.readTextFile(
      join(
        homedir(),
        "Library",
        "Application Support",
        "Steam",
        "config",
        "libraryfolders.vdf",
      ),
    ).then((text) =>
      Object.values(libraryfoldersSchema.parse(parseVdf(text)).libraryfolders)
    );

  /**
   * Determines whether Steam appears to be installed by checking for a
   * `steam://` protocol handler. May open Steam in the background if it is
   * installed.
   *
   * Requires permissions:
   * - `allow-env=HOME`
   * - `allow-run=plutil,open`
   */
  isInstalled = () => isProtocolHandlerRegistered("steam");

  /**
   * Gets information about installed Steam apps.
   *
   * Requires permissions:
   * - `allow-env=HOME`
   * - `allow-read`
   */
  async *getApps() {
    for (const folder of await this.getLibraryfolders()) {
      const folderPath = join(folder.path, "steamapps");
      for await (const entry of Deno.readDir(folderPath)) {
        if (
          !entry.name.startsWith("appmanifest_") ||
          extname(entry.name) !== ".acf"
        ) continue;

        const manifestPath = join(folderPath, entry.name);
        try {
          yield new SteamApp(
            this,
            appManifestSchema.parse(
              parseVdf(await Deno.readTextFile(manifestPath)),
            ),
            manifestPath,
          );
          // deno-lint-ignore no-empty
        } catch {}
      }
    }
  }

  /**
   * Gets information about an installed Steam app.
   *
   * Resolves `undefined` if an app with a matching id cannot be found.
   *
   * Requires permissions:
   * - `allow-env=HOME`
   * - `allow-read`
   *
   * @param id The Steam app id of the app.
   */
  async getAppById(id: string) {
    const folder = (await this.getLibraryfolders()).find((folder) =>
      Object.keys(folder.apps).includes(id)
    );
    if (!folder) return;

    const manifestPath = join(
      folder.path,
      "steamapps",
      `appmanifest_${id}.acf`,
    );

    return new SteamApp(
      this,
      appManifestSchema.parse(
        parseVdf(await Deno.readTextFile(manifestPath)),
      ),
      manifestPath,
    );
  }

  /**
   * Gets information about an installed Steam app. Useful to determine whether
   * a given path refers to an app installed by Steam.
   *
   * Resolves `undefined` if the path does not seem to refer to a Steam app.
   *
   * Requires permissions:
   * - `allow-env=HOME`
   * - `allow-read`
   *
   * @param path The path to the folder where the Steam app is installed.
   */
  async getAppByPath(path: string) {
    let folderPath = join(path, "..", "..", "..");

    try {
      folderPath = await Deno.realPath(folderPath);
    } catch {
      return;
    }

    if (
      !(await booleanRace(
        (await this.getLibraryfolders())
          .map((folder) =>
            Deno.realPath(folder.path)
              .then((path) => path === folderPath)
              .catch(() => false)
          ),
      ))
    ) return;

    const steamapps = join(folderPath, "steamapps");
    for await (const entry of Deno.readDir(steamapps)) {
      if (
        extname(entry.name) !== ".acf" ||
        !entry.name.startsWith("appmanifest_")
      ) continue;

      const manifestPath = join(steamapps, entry.name);
      const manifest = appManifestSchema.parse(
        parseVdf(await Deno.readTextFile(manifestPath)),
      );

      if (basename(path) === manifest.AppState.installdir) {
        return new SteamApp(this, manifest, manifestPath);
      }
    }
  }

  /**
   * Gets information about an installed Steam app.
   *
   * Resolves `undefined` if a matching app cannot be found.
   *
   * Requires permissions:
   * - `allow-env=HOME`
   * - `allow-read`
   *
   * @param idOrPath The Steam app id of the app, or the path to a folder where
   * the app is installed.
   * ```
   */
  getApp = (idOrPath: string) =>
    basename(idOrPath) === idOrPath
      ? this.getAppById(idOrPath)
      : this.getAppByPath(idOrPath);

  /**
   * Launches a Steam app.
   *
   * Requires `allow-run=open` permission.
   *
   * @param app The app to launch.
   */
  async launch(app: SteamApp): Promise<void>;

  /**
   * Launches a Steam app by id or path.
   *
   * Requires permissions:
   * - `allow-run=open`
   * - `allow-env=HOME`
   * - `allow-read`
   *
   * @param app The app id or path of the app to launch.
   */
  async launch(app: string): Promise<void>;

  /**
   * Launches a Steam app.
   *
   * Requires permissions:
   * - `allow-run=open`
   * - `allow-env=HOME`
   * - `allow-read`
   *
   * @param app The app, app id or path of the app to launch.
   */
  async launch(app: SteamApp | string) {
    const id = await match(app)
      .returnType<string | Promise<string | undefined>>()
      .with(P.string, (idOrPath) => basename(idOrPath) === idOrPath, (id) => id)
      .with(P.string, async (path) => (await this.getAppByPath(path))?.id)
      .otherwise((app) => app.id);

    if (!id) return;

    await new Deno.Command("open", { args: [`steam://rungameid/${id}`] })
      .output();
  }
}
