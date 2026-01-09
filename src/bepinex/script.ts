import { file, Glob } from "bun";

import { realpath } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import unquote from "unquote";

import { PathNotFoundError, UnknownPathError } from "../fs/errors";
import {
  hasBepInExCore,
  hasMacOsSupport,
  isDoorstopScript,
} from "../utils/doorstop";
import { getFixedPath } from "../utils/getFixedPath";
import {
  DoorstopScriptMissingPlatformSupport,
  InvalidBepInExPack,
  InvalidDoorstopScript,
} from "./errors";

/**
 * @param value
 *
 * @throws {PathNotFoundError}
 * Path {@link value} could not be found
 *
 * @throws {UnknownPathError}
 * An unknown error occurred trying to resolve path {@link value}
 *
 * @throws {DoorstopScriptMissingPlatformSupport}
 * Resolved BepInEx pack's doorstop script does not support the current platform
 *
 * @throws {InvalidBepInExPack}
 * Directory does not appear to contain a valid BepInEx pack
 *
 * @throws {InvalidDoorstopScript}
 * Path {@link value} does not appear to be a valid doorstop script
 */
export const getBepInExScriptPath = async (value: string): Promise<string> => {
  const input = unquote(value);
  const path = await getFixedPath(input);

  if (!path) throw new PathNotFoundError(input);

  try {
    if (
      await file(path).stat()
        .then((stats) => stats.isDirectory()).catch(() => false)
    ) {
      const glob = new Glob("**/*");
      for await (
        const filePath of glob.scan({
          absolute: true,
          cwd: path,
          dot: true,
          followSymlinks: true,
          onlyFiles: true,
        })
      ) {
        try {
          if (
            await isDoorstopScript(filePath) &&
            await hasBepInExCore(filePath) &&
            await hasMacOsSupport(filePath) &&
            (await file(join(filePath, "..", "libdoorstop.dylib")).stat()
              .then((stats) => stats.isFile()).catch(() => false) ||
              await file(join(filePath, "..", "doorstop_libs")).stat()
                .then((stats) => stats.isDirectory()).catch(() => false))
          ) {
            try {
              return await realpath(filePath);
            } catch {
              return resolve(filePath);
            }
          }
        } catch {}
      }

      throw new InvalidBepInExPack(path);
    }
  } catch (e) {
    if (e instanceof InvalidBepInExPack) {
      throw e;
    }

    throw new UnknownPathError(path, { cause: e });
  }

  if (!await isDoorstopScript(path) || !await hasBepInExCore(path)) {
    try {
      return await getBepInExScriptPath(dirname(path));
    } catch (e) {
      throw new InvalidDoorstopScript(path, { cause: e });
    }
  }

  if (!await hasMacOsSupport(path)) {
    throw new DoorstopScriptMissingPlatformSupport(path, 'macOS');
  }

  const libdoorstop = join(path, "..", "libdoorstop.dylib");
  const oldDoorstop = join(path, "..", "doorstop_libs");

  if (
    !await file(libdoorstop).stat()
      .then((stats) => stats.isFile()).catch(() => false) &&
    !await file(oldDoorstop).stat()
      .then((stats) => stats.isDirectory()).catch(() => false)
  ) {
    throw new InvalidBepInExPack(dirname(path));
  }

  try {
    return await realpath(path);
  } catch {
    return resolve(path);
  }
};
