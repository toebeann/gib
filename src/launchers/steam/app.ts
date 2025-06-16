import { readFile, realpath } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { Glob } from "glob";
import { parse } from "@node-steam/vdf";
import open, { openApp } from "open";
import { match, P } from "ts-pattern";
import { booleanRace } from "../../utils/booleanRace.ts";
import { caseInsensitiveProxy } from "../../utils/proxy.ts";
import type { App as AppBase } from "../app.ts";
import { getLibraryFolders } from "./libraryfolders.ts";
import type { AppManifest } from "./manifest.ts";
import { isOpen } from "./process.ts";

const launcher = "steam";

/** State flags used in Steam's app manifest files. */
export enum AppState {
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

/** An installed Steam app. */
export type App = AppBase<AppManifest> & { launcher: typeof launcher };

export const hasState = (app: App, state: AppState) =>
  (app.manifest.AppState.StateFlags & state) === state;

export const isFullyInstalled = (app: App) =>
  hasState(app, AppState.FullyInstalled);

/**
 * Gets a stored Steam app manifest.
 */
export async function getAppManifest(manifestPath: string) {
  return new Proxy(
    parse(await readFile(manifestPath, { encoding: "utf-8" })),
    caseInsensitiveProxy,
  ) as AppManifest;
}

/**
 * Gets information about installed Steam apps.
 */
export async function* getApps() {
  for (const folder of await getLibraryFolders()) {
    const glob = new Glob("appmanifest_*.acf", {
      absolute: true,
      nodir: true,
      cwd: join(folder.path, "steamapps"),
    });
    for await (const manifestPath of glob) {
      try {
        const manifest = await getAppManifest(manifestPath);

        yield {
          launcher,
          manifest,
          id: manifest.AppState.appid.toString(),
          name: manifest.AppState.name,
          path: join(
            manifestPath,
            "..",
            "common",
            manifest.AppState.installdir,
          ),
        } satisfies App;
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
export const getAppById = async (id: string) => {
  const folder = (await getLibraryFolders()).find((folder) =>
    Object.keys(folder.apps).includes(id)
  );
  if (!folder) return;

  const manifestPath = join(
    folder.path,
    "steamapps",
    `appmanifest_${id}.acf`,
  );

  const manifest = await getAppManifest(manifestPath);

  return {
    launcher,
    manifest,
    id: manifest.AppState.appid.toString(),
    name: manifest.AppState.name,
    path: join(manifestPath, "..", "common", manifest.AppState.installdir),
  } satisfies App;
};

/**
 * Retrives information about installed Steam apps found at `path`.
 *
 * @param path The path to the folder where the Steam app(s) are installed.
 */
export async function* getAppsByPath(path: string) {
  const resolved = resolve(path);
  let folderPath = join(resolved, "..", "..", "..");

  try {
    folderPath = await realpath(folderPath);
  } catch {
    return;
  }

  if (
    !(await booleanRace(
      (await getLibraryFolders())
        .map((folder) =>
          realpath(folder.path)
            .then((path) => path === folderPath)
            .catch(() => false)
        ),
    ))
  ) return;

  const glob = new Glob("appmanifest_*.acf", {
    absolute: true,
    nodir: true,
    cwd: join(folderPath, "steamapps"),
  });
  for await (const manifestPath of glob) {
    const manifest = await getAppManifest(manifestPath);

    if (basename(resolved) === manifest.AppState.installdir) {
      yield {
        launcher,
        manifest,
        id: manifest.AppState.appid.toString(),
        name: manifest.AppState.name,
        path: join(manifestPath, "..", "common", manifest.AppState.installdir),
      } satisfies App;
    }
  }
}

/**
 * Launches a Steam app.
 *
 * @param app The app to launch.
 */
export function launch(app: App): Promise<void>;

/**
 * Launches a Steam app by id.
 *
 * @param id The app id of the app to launch.
 */
export function launch(id: string): Promise<void>;

/**
 * Launches a Steam app.
 *
 * @param app The app or app id of the app to launch.
 */
export function launch(app: App | string): Promise<void>;

export async function launch(app: App | string) {
  const id = await match(app)
    .returnType<string | Promise<string | undefined>>()
    .with(P.string, (id) => id)
    .otherwise((app) => app.id);

  if (!id) return;

  if (await isOpen()) {
    await open(`steam://rungameid/${id}`, {
      background: true,
    });
    return;
  }

  await openApp("Steam", {
    arguments: ["--args", "-silent", "-applaunch", id],
    background: true,
  });
}
