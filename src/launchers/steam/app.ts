import { Glob } from "bun";
import { readFile, realpath } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { parse } from "@node-steam/vdf";
import open from "open";
import { match, P } from "ts-pattern";
import { booleanRace } from "../../utils/booleanRace.ts";
import type { App as AppBase } from "../app.ts";
import { getLibraryFolders } from "./libraryfolders.ts";
import { type AppManifest, appManifestSchema } from "./manifest.ts";

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
export interface App extends AppBase<AppManifest> {
  launcher: typeof launcher;
}

export const hasState = (app: App, state: AppState) =>
  (app.manifest.appState.stateFlags & state) === state;

export const isFullyInstalled = (app: App) =>
  hasState(app, AppState.FullyInstalled);

/**
 * Gets information about installed Steam apps.
 */
export async function* getApps() {
  const glob = new Glob("appmanifest_*.acf");
  for (const folder of await getLibraryFolders()) {
    const folderPath = join(folder.path, "steamapps");
    for await (
      const manifestPath of glob.scan({
        absolute: true,
        onlyFiles: true,
        cwd: folderPath,
      })
    ) {
      try {
        const manifest = appManifestSchema.parse(
          parse(await readFile(manifestPath, { encoding: "utf-8" })),
        );

        return {
          launcher,
          manifest,
          id: manifest.appState.appid.toString(),
          name: manifest.appState.name,
          path: join(
            manifestPath,
            "..",
            "common",
            manifest.appState.installdir,
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

  const manifest = appManifestSchema.parse(
    parse(await readFile(manifestPath, { encoding: "utf-8" })),
  );

  return {
    launcher,
    manifest,
    id: manifest.appState.appid.toString(),
    name: manifest.appState.name,
    path: join(manifestPath, "..", "common", manifest.appState.installdir),
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

  const steamapps = join(folderPath, "steamapps");
  const glob = new Glob("appmanifest_*.acf");
  for await (
    const manifestPath of glob.scan({
      absolute: true,
      onlyFiles: true,
      cwd: steamapps,
    })
  ) {
    const manifest = appManifestSchema.parse(
      parse(await readFile(manifestPath, "utf8")),
    );

    if (basename(resolved) === manifest.appState.installdir) {
      yield {
        launcher,
        manifest,
        id: manifest.appState.appid.toString(),
        name: manifest.appState.name,
        path: join(manifestPath, "..", "common", manifest.appState.installdir),
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

  await open(`steam://rungameid/${id}`);
}
