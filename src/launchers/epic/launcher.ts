import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { Glob } from "glob";
import { match, P } from "ts-pattern";
import { exec } from "../../fs/exec.js";
import { isProtocolHandlerRegistered } from "../../utils/isProtocolHandlerRegistered.js";
import type { Launcher } from "../index.js";
import { appManifestSchema, launcherInstalledSchema, EpicGamesApp, type EpicGamesAppManifest } from "./app.js";

/** An abstraction for working with the Epic Games Launcher and its apps. */
export class EpicGamesLauncher implements Launcher<EpicGamesAppManifest> {
  readonly name = "Epic Games Launcher";

  /**
   * Gets information about Epic Games Launcher apps installed on this
   * computer, parsed from its `LauncherInstalled.dat` file.
   */
  private getLauncherInstalled = async () =>
    launcherInstalledSchema.parse(JSON.parse(
      await readFile(
        join(
          homedir(),
          "Library",
          "Application Support",
          "Epic",
          "UnrealEngineLauncher",
          "LauncherInstalled.dat",
        ),
        { encoding: "utf8" },
      ),
    )).InstallationList;

  /**
   * Gets information about Epic Games Launcher apps installed on this
   * computer, parsed from its `${InstallationGuid}.item` manifest files.
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

    for await (
      const path of new Glob("/*.item", {
        absolute: true,
        nodir: true,
        root: manifestPath,
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
      if (manifest.AppName == id) return manifest;
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
      if (manifest.InstallLocation === path) return manifest;
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
        .find((x) => [x.ArtifactId, x.AppName].includes(manifest.AppName));

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

    try {
      await exec(
        `open com.epicgames.launcher://apps/${launchId}?action=launch&silent=true`,
      );
    } catch {}
  }
}
