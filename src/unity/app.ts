import { file } from "bun";

import {
  basename,
  dirname,
  extname,
  join,
  normalize,
  resolve,
  sep,
} from "node:path";
import { realpath } from "node:fs/promises";

import unquote from "unquote";

import { PathNotAFolderError, PathNotFoundError } from "../fs/errors";
import { exists } from "../fs/exists";
import { getAppById } from "../launchers/steam/app";
import { getFixedPath } from "../utils/getFixedPath";
import {
  parsePlistFromFile,
  parsePlistFromFile as readPlist,
  search as searchPlists,
} from "../utils/plist";
import {
  InvalidUnityApp,
  MultipleUnityAppsFoundError,
  NotAUnityAppError,
} from "./errors";
import { hasUnityAppIndicators } from "./plist";

/**
 * Searches the given `path` for native macOS Unity apps.
 *
 * @param path
 * @param indicators
 */
export const search = async function* (
  path: string,
  indicators?: number,
) {
  const parts = normalize(path).split(sep);
  const index = parts.lastIndexOf("Contents");
  const pathExists = exists(path);
  const isDir = pathExists
    .then((exists) =>
      exists &&
      file(path).stat().then((stats) => stats.isDirectory())
    )
    .catch(() => false);
  const searchDir =
    (extname(path) === ".app" || basename(path) === "Contents") && await isDir
      ? path
      : index >= 0
      ? parts.slice(0, index + 1).join(sep)
      : !await pathExists
      ? undefined
      : await isDir
      ? path
      : dirname(path);

  if (!searchDir) return;

  for await (const path of searchPlists(searchDir)) {
    if (await hasUnityAppIndicators(path, indicators)) {
      const plist = await readPlist(path);
      const { CFBundleName, CFBundleExecutable } = plist;
      const bundle = extname(dirname(dirname(path))) === ".app"
        ? dirname(dirname(path))
        : dirname(path);

      yield {
        name: CFBundleName,
        bundle,
        executable: CFBundleExecutable &&
          join(path, "..", "MacOS", CFBundleExecutable),
        plist,
      };
    }
  }
};

/**
 * @param value
 *
 * @throws {PathNotAFolderError}
 * Path {@link value} is not a folder
 *
 * @throws {PathNotFoundError}
 * Path {@link value} could not be found
 *
 * @throws {InvalidUnityApp}
 * Directory does not appear to contain a valid Unity app
 *
 * @throws {MultipleUnityAppsFoundError}
 * Multiple Unity apps found at path
 *
 * @throws {NotAUnityAppError}
 * The app found at {@link value} does not appear to be a Unity app
 */
export const getUnityAppPath = async (value: string): Promise<string> => {
  const input = unquote(value);
  const path = await getFixedPath(input);

  if (!path) throw new PathNotFoundError(input);

  if (extname(path) !== ".app" && basename(path) !== "Contents") {
    const dir = await file(path).stat()
        .then((stats) => stats.isDirectory()).catch(() => false)
      ? path
      : dirname(path);

    const unityApps = await Array.fromAsync(search(dir));
    if (!unityApps.length) {
      throw new InvalidUnityApp(path);
    } else if (unityApps.length === 1) {
      const [{ bundle, executable }] = unityApps;
      const path = extname(bundle) === ".app" ? bundle : executable;
      try {
        return await realpath(path);
      } catch {
        return resolve(path);
      }
    } else {
      throw new MultipleUnityAppsFoundError(
        unityApps.map(({ bundle }) => bundle),
      );
    }
  }

  if (
    !await file(path).stat()
      .then((stats) => stats.isDirectory()).catch(() => false)
  ) {
    throw new PathNotAFolderError(path);
  }

  const plist = basename(path) === "Contents"
    ? join(path, "Info.plist")
    : join(path, "Contents", "Info.plist");

  if (!await exists(plist)) {
    throw new InvalidUnityApp(path, { cause: new PathNotFoundError(plist) });
  }

  const { CFBundleExecutable } = await parsePlistFromFile(plist);
  if (
    CFBundleExecutable &&
    (file(join(plist, "..", "MacOS", CFBundleExecutable)).type
          .toLowerCase() === "application/x-sh" ||
      extname(CFBundleExecutable) === ".sh")
  ) {
    const text = await file(
      join(plist, "..", "MacOS", CFBundleExecutable),
    )
      .text();

    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => !line.startsWith("#") && Boolean(line));

    if (lines.length === 1 && lines[0].startsWith("open steam://")) {
      const [command, ...args] = lines[0]
        .split("open steam://")[1]
        ?.split("/");
      if (
        ["launch", "run", "rungameid"].includes(command.toLowerCase()) &&
        !!+args[0]
      ) {
        const steamApp = await getAppById(args[0]);
        if (steamApp) {
          const unityApps = await Array.fromAsync(search(steamApp.path));
          if (unityApps.length === 1) {
            const [{ bundle, executable }] = unityApps;
            const path = extname(bundle) === ".app" ? bundle : executable;
            try {
              return await realpath(path);
            } catch {
              return resolve(path);
            }
          } else if (unityApps.length > 1) {
            throw new MultipleUnityAppsFoundError(
              unityApps.map(({ bundle }) => bundle),
            );
          }
        }
      }
    }
  }

  if (!await hasUnityAppIndicators(plist)) {
    throw new NotAUnityAppError(path);
  }

  const bestPath = basename(path) === "Contents"
    ? extname(dirname(path)) === ".app"
      ? dirname(path)
      : join(plist, "..", "MacOS", CFBundleExecutable)
    : path;

  try {
    return await realpath(bestPath);
  } catch {
    return resolve(bestPath);
  }
};
