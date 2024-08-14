import { stat } from "node:fs/promises";
import { join } from "node:path";
import { quote } from "shell-quote";
import { z } from "zod";
import { exec } from "../fs/exec.ts";
import { booleanRace } from "../utils/booleanRace.ts";

const plistStrictSchema = z.object({
  CFBundleName: z.string().optional(),
  CFBundleExecutable: z.string().optional(),
  UnityBuildNumber: z.unknown().optional(),
  CFBundleShortVersionString: z.string().optional(),
  CFBundleGetInfoString: z.string().optional(),
});
type PlistStrict = z.infer<typeof plistStrictSchema>;

/** Zod schema for working with macOS Unity app Info.plist files. */

export const plistSchema = plistStrictSchema.passthrough();

/** A parsed macOS Unity app Info.plist. */

export type Plist = z.infer<typeof plistSchema>;

type Key = keyof PlistStrict | (string & {});

/**
 * Parses the plist file at `path` and returns it.
 * @param path The path to an `Info.plist` file to parse.
 */

export const readFile = (path: string) =>
  exec(
    quote([
      "plutil",
      "-convert",
      "json",
      "-o",
      "-",
      path,
    ]),
  ).then(({ stdout }) => plistSchema.parse(JSON.parse(stdout.trim())));

/**
 * Retrieves a value from the plist file at `path` with given `key`.
 * @param path The path to an `Info.plist` file to parse.
 * @param key The key to look up in the `Info.plist` file.
 * @returns A string representation of the value in the plist file matching `key`,
 * or `undefined` if no matching key found.
 */

export const getValue = (path: string, key: Key) =>
  exec(
    quote([
      "plutil",
      "-extract",
      key,
      "raw",
      "-o",
      "-",
      path,
    ]),
  )
    .then(({ stdout }) => stdout.trim())
    .catch(() => undefined);

/**
 * Determines whether the macOS Application corresponding with the provided
 * `Info.plist` file contains at least one of several files which are common to
 * Unity games, e.g. `.app/Contents/Resources/Data/globalgamemanagers`.
 *
 * @param plist The path to the `Info.plist` of the macOS Application to check.
 */

export const hasCommonUnityFiles = (plist: string) =>
  booleanRace([
    stat(join(plist, "..", "Data", "boot.config")),
    stat(join(plist, "..", "Resources", "Data", "boot.config")),
    stat(join(plist, "..", "Data", "globalgamemanagers")),
    stat(join(plist, "..", "Resources", "Data", "globalgamemanagers")),
    stat(join(plist, "..", "Data", "resources.assets")),
    stat(join(plist, "..", "Resources", "Data", "resources.assets")),
  ].map((promise) =>
    promise
      .then((stats) => stats.isFile())
      .catch(() => false)
  ));

/**
 * Determines whether the provided `Info.plist` file contains at least one of
 * several strings which are common to Unity games, e.g. `"Unity Player"`.
 *
 * @param plist The path to the `Info.plist` of the macOS Application to check.
 */

export const hasCommonUnityString = async (plist: string) =>
  exec(
    quote([
      "plutil",
      "-convert",
      "json",
      "-o",
      plist,
    ]),
  ).then(({ stdout }) =>
    !!stdout.trim().match(new RegExp("Unity Player|Unity Technologies", "g"))
  );

/**
 * Determines whether the macOS Application corresponding with the provided
 * `Info.plist` file has at least n indicators that it is a Unity app.
 *
 * @param plist The path to the `Info.plist` of the macOS Application to check.
 * @param n The number of indicators required to pass. Defaults to 2.
 */

export const hasUnityAppIndicators = (plist: string, n = 2) =>
  booleanRace(
    [
      hasUnityBuildNumber(plist),
      hasCommonUnityString(plist),
      hasUnityPlayerDylib(plist),
      hasCommonUnityFiles(plist),
    ].map((promise) => promise.catch(() => false)),
    n,
  );

/**
 * Determines whether the provided `Info.plist` file contains a value with the
 * key `UnityBuildNumber`.
 *
 * @param plist The path to the `Info.plist` of the macOS Application to check.
 */

export const hasUnityBuildNumber = async (plist: string) =>
  getValue(plist, "UnityBuildNumber")
    .then(() => true)
    .catch(() => false);

/**
 * Determines whether the macOS Application corresponding with the provided
 * `Info.plist` file contains a `UnityPlayer.dylib` file in its `Frameworks`
 * directory.
 *
 * @param plist The path to the `Info.plist` of the macOS Application to check.
 */

export const hasUnityPlayerDylib = (plist: string) =>
  stat(join(plist, "..", "Frameworks", "UnityPlayer.dylib"))
    .then((stats) => stats.isFile())
    .catch(() => false);
