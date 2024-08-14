import { readFile, realpath } from "node:fs/promises";
import { basename, join } from "node:path";
import type { platform } from "node:process";
import { Glob } from "glob";
import open from "open";
import { match, P } from "ts-pattern";
import { parse } from "@node-steam/vdf";
import { z } from "zod";
import { booleanRace } from "../../utils/booleanRace.ts";
import { isProtocolHandlerRegistered } from "../../utils/isProtocolHandlerRegistered.ts";
import type { Launcher as LauncherBase } from "../launcher.ts";
import { appManifestSchema, App, type AppManifest } from "./app.ts";
import { getLibraryfoldersPath } from "./getLibraryfoldersPath.ts";

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
export type LibraryFolders = z.infer<typeof libraryfoldersSchema>;

/** An abstraction for working with Steam and its apps. */
export class Launcher implements LauncherBase<AppManifest> {
  readonly name = "Steam";
  readonly supportedPlatforms = [
    "darwin",
    "linux",
    "win32",
  ] satisfies typeof platform[];

  /**
   * Gets information about Steam Library folders on this computer, parsed from
   * Steam's `libraryfolders.vdf` file.
   */
  private getLibraryfolders = () =>
    readFile(
      getLibraryfoldersPath(),
      { encoding: "utf8" },
    ).then((text) =>
      Object.values(libraryfoldersSchema.parse(parse(text)).libraryfolders)
    );

  /**
   * Determines whether Steam appears to be installed by checking for a
   * `steam://` protocol handler. May open Steam in the background if it is
   * installed.
   */
  isInstalled = () => isProtocolHandlerRegistered("steam");

  /**
   * Gets information about installed Steam apps.
   */
  async *getApps() {
    for (const folder of await this.getLibraryfolders()) {
      const folderPath = join(folder.path, "steamapps");
      for await (
        const manifestPath of new Glob("/appmanifest_*.acf", {
          absolute: true,
          nodir: true,
          root: folderPath,
        })
      ) {
        try {
          yield new App(
            this,
            appManifestSchema.parse(
              parse(await readFile(manifestPath, { encoding: "utf8" })),
            ),
            manifestPath,
          );
        } catch {}
      }
    }
  }

  /**
   * Gets information about an installed Steam app.
   *
   * Resolves `undefined` if an app with a matching id cannot be found.
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

    return new App(
      this,
      appManifestSchema.parse(
        parse(await readFile(manifestPath, { encoding: "utf8" })),
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
   * @param path The path to the folder where the Steam app is installed.
   */
  async getAppByPath(path: string) {
    let folderPath = join(path, "..", "..", "..");

    try {
      folderPath = await realpath(folderPath);
    } catch {
      return;
    }

    if (
      !(await booleanRace(
        (await this.getLibraryfolders())
          .map((folder) =>
            realpath(folder.path)
              .then((path) => path === folderPath)
              .catch(() => false)
          ),
      ))
    ) return;

    const steamapps = join(folderPath, "steamapps");
    for await (
      const manifestPath of new Glob("/appmanifest_*.acf", {
        absolute: true,
        nodir: true,
        root: steamapps,
      })
    ) {
      const manifest = appManifestSchema.parse(
        parse(await readFile(manifestPath, { encoding: "utf8" })),
      );

      if (basename(path) === manifest.appState.installdir) {
        yield new App(this, manifest, manifestPath);
      }
    }
  }

  getApp = this.getAppById;

  /**
   * Launches a Steam app.
   *
   * @param app The app to launch.
   */
  async launch(app: App): Promise<void>;

  /**
   * Launches a Steam app by id or path.
   *
   * @param app The app id or path of the app to launch.
   */
  async launch(app: string): Promise<void>;

  /**
   * Launches a Steam app.
   *
   * @param app The app, app id or path of the app to launch.
   */
  async launch(app: App | string) {
    const id = await match(app)
      .returnType<string | Promise<string | undefined>>()
      .with(P.string, (idOrPath) => basename(idOrPath) === idOrPath, (id) => id)
      .with(P.string, async (path) => (await this.getAppByPath(path))?.id)
      .otherwise((app) => app.id);

    if (!id) return;

    await open(`steam://rungameid/${id}`);
  }
}
