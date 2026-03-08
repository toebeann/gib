import { env } from "bun";

import { homedir } from "node:os";
import { platform } from "node:os" with { type: "macro" };
import { join } from "node:path";

/** Default Epic Games Launcher data folder path. */
export const DEFAULT_DATA_FOLDER_PATH = platform() === "darwin"
  ? join(homedir(), "Library", "Application Support", "Epic")
  : platform() === "win32"
  ? join(env.PROGRAMDATA ?? homedir(), "Epic")
  : "";

/** Retrieves the path to Epic's `LauncherInstalled.dat` file. */
export const getLauncherInstalledPath = (dataPath = DEFAULT_DATA_FOLDER_PATH) =>
  join(dataPath, "UnrealEngineLauncher", "LauncherInstalled.dat");

/** Retrieves the path to Epic Games Launcher's `Manifests` folder. */
export const getManifestsPath = (dataPath = DEFAULT_DATA_FOLDER_PATH) =>
  join(dataPath, "EpicGamesLauncher", "Data", "Manifests");
