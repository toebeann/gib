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
export type App = AppBase<AppManifest> & {
  launcher: typeof launcher;
  launchId: string;
};

export const isFullyInstalled = ({ manifest: { bIsIncompleteInstall } }: App) =>
  bIsIncompleteInstall !== true;

/** Gets information about installed Epic Games Launcher apps. */
export async function* getApps() {
  const launcherInstalled = getLauncherInstalled();

  for await (const _manifest of getManifests()) {
    const info = (await launcherInstalled)
      .find((x) => [x.artifactId, x.appName].includes(_manifest.appName));

    if (info) {
      const manifest = { ...info, ..._manifest };
      const {
        displayName: name,
        installLocation: path,
        namespaceId,
        catalogNamespace,
        itemId,
        catalogItemId,
        artifactId,
        appName,
      } = manifest;
      const id = typeof artifactId === "string" ? artifactId : appName;
      const launchId = [
        typeof namespaceId === "string" ? namespaceId : catalogNamespace,
        typeof itemId === "string" ? itemId : catalogItemId,
        id,
      ].filter(Boolean).join(":");
      yield {
        launcher,
        manifest,
        id,
        name,
        path,
        launchId,
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
          apps.find((app) => [app.artifactId, app.appName].includes(id))
        ),
      getManifestById(id),
    ]),
  )
    .returnType<App | undefined>()
    .with([P.not(P.nullish), P.not(P.nullish)], ([info, _manifest]) => {
      const manifest = { ...info, ..._manifest };
      const {
        displayName: name,
        installLocation: path,
        namespaceId,
        catalogNamespace,
        itemId,
        catalogItemId,
        artifactId,
        appName,
      } = manifest;
      const id = typeof artifactId === "string" ? artifactId : appName;
      const launchId = [
        typeof namespaceId === "string" ? namespaceId : catalogNamespace,
        typeof itemId === "string" ? itemId : catalogItemId,
        id,
      ].filter(Boolean).join(":");
      return {
        launcher,
        manifest,
        id,
        name,
        path,
        launchId,
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
    .with([P.not(P.nullish), P.not(P.nullish)], ([info, _manifest]) => {
      const manifest = { ...info, ..._manifest };
      const {
        displayName: name,
        installLocation: path,
        namespaceId,
        catalogNamespace,
        itemId,
        catalogItemId,
        artifactId,
        appName,
      } = manifest;
      const id = typeof artifactId === "string" ? artifactId : appName;
      const launchId = [
        typeof namespaceId === "string" ? namespaceId : catalogNamespace,
        typeof itemId === "string" ? itemId : catalogItemId,
        id,
      ].filter(Boolean).join(":");
      return {
        launcher,
        manifest,
        id,
        name,
        path,
        launchId,
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
