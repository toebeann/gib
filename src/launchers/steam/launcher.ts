import { readFile, realpath } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import type { platform } from "node:process";
import { Glob } from "glob";
import open from "open";
import { match, P } from "ts-pattern";
import { parse } from "@node-steam/vdf";
import { z } from "zod";
import { booleanRace } from "../../utils/booleanRace.ts";
import { isProtocolHandlerRegistered } from "../../utils/isProtocolHandlerRegistered.ts";
import type { Launcher as LauncherBase } from "../launcher.ts";
import { getLibraryfolders } from "./libraryfolders.ts";

const numericBooleanSchema = z.union([z.literal(0), z.literal(1)]);

/** Zod schema for working with Steam's `loginusers.vdf` file. */
export const loginusersSchema = z.object({
  users: z.record(
    z.object({
      AccountName: z.string(),
      PersonaName: z.unknown().optional(),
      RememberPassword: numericBooleanSchema.optional(),
      WantsOfflineMode: numericBooleanSchema.optional(),
      SkipOfflineModeWarning: numericBooleanSchema.optional(),
      AllowAutoLogin: numericBooleanSchema.optional(),
      MostRecent: numericBooleanSchema,
      Timestamp: z.number().optional(),
    }).passthrough(),
  ),
});

/** Steam's `loginusers.vdf` file, parsed. */
export type LoginUsers = z.infer<typeof loginusersSchema>;

/** Zod schema for working with Steam's `localconfig.vdf` files. */
export const localconfigSchema = z.object({
  UserLocalConfigStore: z.object({
    Software: z.object({
      Valve: z.object({
        Steam: z.object({
          apps: z.record(
            z.object({
              LastPlayed: z.number().optional(),
              Playtime2wks: z.number().optional(),
              Playtime: z.number().optional(),
              cloud: z.object({
                last_sync_state: z.string().optional(),
              }).passthrough().optional(),
              autocloud: z.object({
                lastlaunch: z.number().optional(),
                lastexit: z.number().optional(),
              }).passthrough().optional(),
              BadgeData: z.number().optional(),
              LaunchOptions: z.union([z.string(), z.number()]).optional(),
            }).passthrough(),
          ),
          LastPlayedTimesSyncTime: z.number().optional(),
          PlayerLevel: z.number().optional(),
          SmallMode: numericBooleanSchema.optional(),
        }).passthrough(),
      }).passthrough(),
    }).passthrough(),
  }).passthrough(),
});

/** One of Steam's `localconfig.vdf` files, parsed. */
export type LocalConfig = z.infer<typeof localconfigSchema>;

/** Zod schema for working with Steam's binary `shortcuts.vdf` files. */
export const shortcutsSchema = z.object({
  shortcuts: z.record(
    z.object({
      appid: z.number().optional(),
      AppName: z.string().optional(),
      Exe: z.string().optional(),
      StartDir: z.string().optional(),
      icon: z.string().optional(),
      ShortcutPath: z.string().optional(),
      LaunchOptions: z.string().optional(),
      IsHidden: numericBooleanSchema.optional(),
      AllowDesktopConfig: numericBooleanSchema.optional(),
      AllowOverlay: numericBooleanSchema.optional(),
      LastPlayTime: z.number().optional(),
    }).passthrough(),
  ),
});

/** One of Steam's binary `shortcuts.vdf` files, parsed. */
export type Shortcuts = z.infer<typeof shortcutsSchema>;

/** A Shortcut entry for Steam's binary `shortcuts.vdf` files.s */
export type Shortcut = Shortcuts["shortcuts"][string];

/** An abstraction for working with Steam and its apps. */
export class Launcher implements LauncherBase<AppManifest> {
  readonly name = "Steam";
  readonly supportedPlatforms = [
    "darwin",
    "linux",
    "win32",
  ] satisfies typeof platform[];

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
    for (const folder of await getLibraryfolders()) {
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
    const folder = (await getLibraryfolders()).find((folder) =>
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
   * Retrives information about installed Steam apps found at `path`.
   *
   * @param path The path to the folder where the Steam app(s) are installed.
   */
  async *getAppsByPath(path: string) {
    const resolved = resolve(path);
    let folderPath = join(resolved, "..", "..", "..");

    try {
      folderPath = await realpath(folderPath);
    } catch {
      return;
    }

    if (
      !(await booleanRace(
        (await getLibraryfolders())
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

      if (basename(resolved) === manifest.appState.installdir) {
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
   * Launches a Steam app by id.
   *
   * @param id The app id of the app to launch.
   */
  async launch(id: string): Promise<void>;

  /**
   * Launches a Steam app.
   *
   * @param app The app or app id of the app to launch.
   */
  async launch(app: App | string): Promise<void>;

  async launch(app: App | string) {
    const id = await match(app)
      .returnType<string | Promise<string | undefined>>()
      .with(P.instanceOf(App), (app) => app.id)
      .with(P.string, (id) => id)
      .exhaustive();

    if (!id) return;

    await open(`steam://rungameid/${id}`);
  }
}
