import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Retrieves the path to the Epic Games Launcher's AppData folder on this
 * computer.
 */
export const getAppDataPath = () =>
  join(
    homedir(),
    "Library",
    "Application Support",
    "Epic",
    "EpicGamesLauncher",
    "Data",
  );
