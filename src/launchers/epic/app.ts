import { basename } from "node:path";
import open from "open";
import { match, P } from "ts-pattern";
import type { App as AppBase } from "../app.ts";
import { getLauncherInstalled } from "./launcherInstalled.ts";
import {
  type AppManifest,
  getManifestById,
  getManifestByPath,
  getManifests,
} from "./manifest.ts";

const launcher = "epic";

/** An installed Epic Games Launcher app. */
export interface App extends AppBase<AppManifest> {
  launcher: typeof launcher;
  launchId: string;
}

export const isFullyInstalled = (app: App) =>
  app.manifest.bIsIncompleteInstall !== true;

/** Gets information about installed Epic Games Launcher apps. */
export async function* getApps() {
  const launcherInstalled = getLauncherInstalled();

  for await (const manifest of getManifests()) {
    const info = (await launcherInstalled)
      .find((x) => [x.artifactId, x.appName].includes(manifest.appName));

    if (info) {
      const merged = { ...info, ...manifest };
      yield {
        launcher,
        manifest: merged,
        id: merged.artifactId ?? merged.appName,
        name: merged.displayName,
        path: merged.installLocation,
        launchId: [
          merged.namespaceId ?? merged.catalogNamespace,
          merged.itemId ?? merged.catalogItemId,
          merged.artifactId ?? merged.appName,
        ]
          .filter(Boolean)
          .join(":"),
      } satisfies App;
    }
  }
}

/**
 * Gets information about an installed Epic Games Launcher app.
 *
 * Resolves `undefined` if an app with a matching id cannot be found.
 *
 * @param id The ArtifactId or AppName of the app.
 */
export const getAppById = async (id: string) =>
  match(
    await Promise.all([
      getLauncherInstalled()
        .then((apps) =>
          apps.find((app) => [app.ArtifactId, app.AppName].includes(id))
        ),
      getManifestById(id),
    ]),
  )
    .returnType<App | undefined>()
    .with([P.not(P.nullish), P.not(P.nullish)], ([info, manifest]) => {
      const merged = { ...info, ...manifest };
      return {
        launcher,
        manifest: merged,
        id: merged.artifactId ?? merged.appName,
        name: merged.displayName,
        path: merged.installLocation,
        launchId: [
          merged.namespaceId ?? merged.catalogNamespace,
          merged.itemId ?? merged.catalogItemId,
          merged.artifactId ?? merged.appName,
        ]
          .filter(Boolean)
          .join(":"),
      } satisfies App;
    })
    .otherwise(() => undefined);

/**
 * Gets information about an installed Epic Games Launcher app.
 *
 * Resolves `undefined` if an app with a matching path cannot be found.
 *
 * @param path The InstallLocation of the app.
 */
export const getAppByPath = async (path: string) =>
  match(
    await Promise.all([
      getLauncherInstalled()
        .then((apps) => apps.find((app) => app.installLocation === path)),
      getManifestByPath(path),
    ]),
  )
    .returnType<App | undefined>()
    .with([P.not(P.nullish), P.not(P.nullish)], ([info, manifest]) => {
      const merged = { ...info, ...manifest };
      return {
        launcher,
        manifest: merged,
        id: merged.artifactId ?? merged.appName,
        name: merged.displayName,
        path: merged.installLocation,
        launchId: [
          merged.namespaceId ?? merged.catalogNamespace,
          merged.itemId ?? merged.catalogItemId,
          merged.artifactId ?? merged.appName,
        ]
          .filter(Boolean)
          .join(":"),
      } satisfies App;
    })
    .otherwise(() => undefined);

/**
 * Launches an Epic Games Launcher app.
 *
 * @param app The app to launch.
 */
export function launch(app: App): Promise<void>;

/**
 * Launches an Epic Games Launcher app.
 *
 * @param app The ArtifactId, AppName or InstallLocation of the app.
 */
export function launch(app: string): Promise<void>;

/**
 * Launches an Epic Games Launcher app.
 *
 * @param app The app, ArtifactId, AppName or InstallLocation of the app.
 */
export function launch(app: App | string): Promise<void>;

export async function launch(app: App | string): Promise<void> {
  const launchId = await match(app)
    .returnType<string | Promise<string | undefined>>()
    .with(
      P.string,
      (idOrPath) => basename(idOrPath) === idOrPath,
      async (id) => (await getAppById(id))?.launchId,
    )
    .with(P.string, (path) => path)
    .otherwise((app) => app.launchId);

  if (!launchId) return;

  await open(
    `com.epicgames.launcher://apps/${launchId}?action=launch&silent=true`,
  );
}
