import { basename, extname, homedir, join, match, P, z } from "../deps.ts";
import { isProtocolHandlerRegistered } from "../utils/isProtocolHandlerRegistered.ts";
import { App, Launcher } from "./mod.ts";

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

/** An abstraction for working with the Epic Games Launcher and its apps. */
export class EpicGamesLauncher implements Launcher<EpicGamesAppManifest> {
  readonly name = "Epic Games Launcher";

  /**
   * Gets information about Epic Games Launcher apps installed on this
   * computer, parsed from its `LauncherInstalled.dat` file.
   *
   * Requires permissions:
   * - `allow-env=HOME`
   * - `allow-read="$HOME/Library/Application
   *    Support/Epic/UnrealEngineLauncher/LauncherInstalled.dat"`
   */
  private getLauncherInstalled = async () =>
    launcherInstalledSchema.parse(JSON.parse(
      await Deno.readTextFile(join(
        homedir(),
        "Library",
        "Application Support",
        "Epic",
        "UnrealEngineLauncher",
        "LauncherInstalled.dat",
      )),
    )).InstallationList;

  /**
   * Gets information about Epic Games Launcher apps installed on this
   * computer, parsed from its `${InstallationGuid}.item` manifest files.
   *
   * Requires permissins:
   * - `allow-env=HOME`
   * - `allow-read="$HOME/Library/Application
   *    Support/Epic/EpicGamesLauncher/Data/Manifests"`
   */
  private async *getManifests() {
    const manifestPath = join(
      homedir(),
      "Library",
      "Application Support",
      "Epic",
      "EpicGamesLauncher",
      "Data",
      "Manifests",
    );

    for await (const entry of Deno.readDir(manifestPath)) {
      if (extname(entry.name) !== ".item") continue;
      yield appManifestSchema.parse(
        JSON.parse(await Deno.readTextFile(join(manifestPath, entry.name))),
      );
    }
  }

  /**
   * Gets information about an installed Epic Games Launcher app, parsed from
   * its `${InstallationGuid}.item` manifest file.
   *
   * Resolves `undefined` if a manifest with a matching id cannot be found.
   *
   * Requires permissins:
   * - `allow-env=HOME`
   * - `allow-read="$HOME/Library/Application
   *    Support/Epic/EpicGamesLauncher/Data/Manifests"`
   *
   * @param id The ArtifactId or AppName of the app.
   */
  private async getManifestById(id: string) {
    for await (const manifest of this.getManifests()) {
      if (manifest.AppName == id) return manifest;
    }
  }

  /**
   * Gets information about an installed Epic Games Launcher app, parsed from
   * its `${InstallationGuid}.item` manifest file.
   *
   * Resolves `undefined` if a manifest with a matching path cannot be found.
   *
   * Requires permissins:
   * - `allow-env=HOME`
   * - `allow-read="$HOME/Library/Application
   *    Support/Epic/EpicGamesLauncher/Data/Manifests"`
   *
   * @param path The InstallLocation of the app.
   */
  private async getManifestByPath(path: string) {
    for await (const manifest of this.getManifests()) {
      if (manifest.InstallLocation === path) return manifest;
    }
  }

  /**
   * Gets information about an installed Epic Games Launcher app, parsed from
   * its `${InstallationGuid}.item` manifest file.
   *
   * Resolves `undefined` if a matching manifest cannot be found.
   *
   * Requires permissins:
   * - `allow-env=HOME`
   * - `allow-read="$HOME/Library/Application
   *    Support/Epic/EpicGamesLauncher/Data/Manifests"`
   *
   * @param idOrPath The ArtifactId, AppName or InstallLocation of the app.
   */
  private getManifest = (idOrPath: string) =>
    basename(idOrPath) === idOrPath
      ? this.getManifestById(idOrPath)
      : this.getManifestByPath(idOrPath);

  /**
   * Determines whether the Epic Games Launcher appears to be installed by
   * checking for a `com.epicgames.launcher://` protocol handler. May open the
   * Epic Games Launcher in the background if it is installed.
   *
   * Requires permissions:
   * - `allow-env=HOME`
   * - `allow-run=plutil,open`
   */
  isInstalled = () => isProtocolHandlerRegistered("com.epicgames.launcher");

  /**
   * Gets information about installed Epic Games Launcher apps.
   *
   * Requires permissions:
   * - `allow-env=HOME`
   * - `allow-read="$HOME/Library/Application
   *    Support/Epic/EpicGamesLauncher/Data/Manifests","$HOME/Library/Application
   *    Support/Epic/UnrealEngineLauncher/LauncherInstalled.dat"`
   */
  async *getApps() {
    const launcherInstalled = this.getLauncherInstalled();

    for await (const manifest of this.getManifests()) {
      const info = (await launcherInstalled)
        .find((x) => [x.ArtifactId, x.AppName].includes(manifest.AppName));

      if (info) yield new EpicGamesApp(this, { ...info, ...manifest });
    }
  }

  /**
   * Gets information about an installed Epic Games Launcher app.
   *
   * Resolves `undefined` if an app with a matching id cannot be found.
   *
   * Requires permissions:
   * - `allow-env=HOME`
   * - `allow-read="$HOME/Library/Application
   *    Support/Epic/EpicGamesLauncher/Data/Manifests","$HOME/Library/Application
   *    Support/Epic/UnrealEngineLauncher/LauncherInstalled.dat"`
   *
   * @param id The ArtifactId or AppName of the app.
   */
  getAppById = async (id: string) =>
    match(
      await Promise.all([
        this.getLauncherInstalled()
          .then((apps) =>
            apps.find((app) => [app.ArtifactId, app.AppName].includes(id))
          ),
        this.getManifestById(id),
      ]),
    )
      .returnType<EpicGamesApp | undefined>()
      .with([P.not(P.nullish), P.not(P.nullish)], ([info, manifest]) =>
        new EpicGamesApp(this, { ...info, ...manifest }))
      .otherwise(() =>
        undefined
      );

  /**
   * Gets information about an installed Epic Games Launcher app.
   *
   * Resolves `undefined` if an app with a matching path cannot be found.
   *
   * Requires permissions:
   * - `allow-env=HOME`
   * - `allow-read="$HOME/Library/Application
   *    Support/Epic/EpicGamesLauncher/Data/Manifests","$HOME/Library/Application
   *    Support/Epic/UnrealEngineLauncher/LauncherInstalled.dat"`
   *
   * @param path The InstallLocation of the app.
   */
  getAppByPath = async (path: string) =>
    match(
      await Promise.all([
        this.getLauncherInstalled()
          .then((apps) => apps.find((app) => app.InstallLocation === path)),
        this.getManifestByPath(path),
      ]),
    )
      .returnType<EpicGamesApp | undefined>()
      .with([P.not(P.nullish), P.not(P.nullish)], ([info, manifest]) =>
        new EpicGamesApp(this, { ...info, ...manifest }))
      .otherwise(() =>
        undefined
      );

  /**
   * Gets information about an installed Epic Games Launcher app.
   *
   * Resolves `undefined` if a matching app cannot be found.
   *
   * Requires permissions:
   * - `allow-env=HOME`
   * - `allow-read="$HOME/Library/Application
   *    Support/Epic/EpicGamesLauncher/Data/Manifests","$HOME/Library/Application
   *    Support/Epic/UnrealEngineLauncher/LauncherInstalled.dat"`
   *
   * @param idOrPath The ArtifactId, AppName or InstallLocation of the app.
   */
  getApp = (idOrPath: string) =>
    basename(idOrPath) === idOrPath
      ? this.getAppById(idOrPath)
      : this.getAppByPath(idOrPath);

  /**
   * Launches an Epic Games Launcher app.
   *
   * Requires `allow-run=open` permission.
   *
   * @param app The app to launch.
   */
  launch(app: EpicGamesApp): Promise<void>;

  /**
   * Launches an Epic Games Launcher app.
   *
   * Requires permissions:
   * - `allow-run=open`
   * - `allow-env=HOME`
   * - `allow-read="$HOME/Library/Application
   *    Support/Epic/EpicGamesLauncher/Data/Manifests","$HOME/Library/Application
   *    Support/Epic/UnrealEngineLauncher/LauncherInstalled.dat"`
   *
   * @param app The ArtifactId, AppName or InstallLocation of the app.
   */
  launch(app: string): Promise<void>;

  /**
   * Launches an Epic Games Launcher app.
   *
   * Requires permissions:
   * - `allow-run=open`
   * - `allow-env=HOME`
   * - `allow-read="$HOME/Library/Application
   *    Support/Epic/EpicGamesLauncher/Data/Manifests","$HOME/Library/Application
   *    Support/Epic/UnrealEngineLauncher/LauncherInstalled.dat"`
   *
   * @param app The app, ArtifactId, AppName or InstallLocation of the app.
   */
  async launch(app: EpicGamesApp | string): Promise<void> {
    const launchId = await match(app)
      .returnType<string | Promise<string | undefined>>()
      .with(
        P.string,
        (idOrPath) => basename(idOrPath) === idOrPath,
        async (id) => (await this.getAppById(id))?.launchId,
      )
      .with(P.string, (path) => path)
      .otherwise((app) => app.launchId);

    if (!launchId) return;

    await new Deno.Command("open", {
      args: [
        `com.epicgames.launcher://apps/${launchId}?action=launch&silent=true`,
      ],
    }).output();
  }
}
