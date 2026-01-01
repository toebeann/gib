import { platform } from "node:os" with { type: "macro" };

import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Retrieves the path to the Epic Games Launcher's AppData folder on this
 * computer.
 */
export const getAppDataPath = () => {
  if (platform() === "darwin") {
    return join(
      homedir(),
      "Library",
      "Application Support",
      "Epic",
      "EpicGamesLauncher",
      "Data",
    );
  }

  return "";
};
