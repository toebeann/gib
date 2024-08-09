import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import type { platform } from "node:process";
import { Glob } from "glob";
import open from "open";
import { match, P } from "ts-pattern";
import { isProtocolHandlerRegistered } from "../../utils/isProtocolHandlerRegistered.ts";
import type { Launcher } from "../index.ts";
import {
  appManifestSchema,
  EpicGamesApp,
  type EpicGamesAppManifest,
  launcherInstalledSchema,
} from "./app.ts";
import { getAppDataPath } from "./getAppDataPath.ts";

/** An abstraction for working with the Epic Games Launcher and its apps. */
export class EpicGamesLauncher implements Launcher<EpicGamesAppManifest> {
  readonly name = "Epic Games Launcher";
  readonly supportedPlatforms = [
    "darwin",
    "win32",
  ] satisfies typeof platform[];

  /**
   * Gets information about Epic Games Launcher apps installed on this
   * computer, parsed from its `LauncherInstalled.dat` file.
   */
  private getLauncherInstalled = async () =>
    launcherInstalledSchema.parse(JSON.parse(
      await readFile(
        join(
          getAppDataPath(),
          "..",
          "..",
          "UnrealEngineLauncher",
          "LauncherInstalled.dat",
        ),
        { encoding: "utf8" },
      ),
    )).installationList;

  /**
   * Gets information about Epic Games Launcher apps installed on this
   * computer, parsed from its `${InstallationGuid}.item` manifest files.
   */
  private async *getManifests() {
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
  private async getManifestById(id: string) {
    for await (const manifest of this.getManifests()) {
      if (manifest.appName == id) return manifest;
    }
  }

  /**
   * Gets information about an installed Epic Games Launcher app, parsed from
   * its `${InstallationGuid}.item` manifest file.
   *
   * Resolves `undefined` if a manifest with a matching path cannot be found.
   *
   * @param path The InstallLocation of the app.
   */
  private async getManifestByPath(path: string) {
    for await (const manifest of this.getManifests()) {
      if (manifest.installLocation === path) return manifest;
    }
  }

  /**
   * Gets information about an installed Epic Games Launcher app, parsed from
   * its `${InstallationGuid}.item` manifest file.
   *
   * Resolves `undefined` if a matching manifest cannot be found.
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
   */
  isInstalled = () => isProtocolHandlerRegistered("com.epicgames.launcher");

  /**
   * Gets information about installed Epic Games Launcher apps.
   */
  async *getApps() {
    const launcherInstalled = this.getLauncherInstalled();

    for await (const manifest of this.getManifests()) {
      const info = (await launcherInstalled)
        .find((x) => [x.artifactId, x.appName].includes(manifest.appName));

      if (info) yield new EpicGamesApp(this, { ...info, ...manifest });
    }
  }

  /**
   * Gets information about an installed Epic Games Launcher app.
   *
   * Resolves `undefined` if an app with a matching id cannot be found.
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
   * @param idOrPath The ArtifactId, AppName or InstallLocation of the app.
   */
  getApp = (idOrPath: string) =>
    basename(idOrPath) === idOrPath
      ? this.getAppById(idOrPath)
      : this.getAppByPath(idOrPath);

  /**
   * Launches an Epic Games Launcher app.
   *
   * @param app The app to launch.
   */
  launch(app: EpicGamesApp): Promise<void>;

  /**
   * Launches an Epic Games Launcher app.
   *
   * @param app The ArtifactId, AppName or InstallLocation of the app.
   */
  launch(app: string): Promise<void>;

  /**
   * Launches an Epic Games Launcher app.
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

    await open(
      `com.epicgames.launcher://apps/${launchId}?action=launch&silent=true`,
    );
  }
}
