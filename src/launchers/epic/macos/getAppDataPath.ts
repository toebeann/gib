import { homedir } from "node:os";
import { join } from "node:path";

export const getAppDataPath = () =>
  join(
    homedir(),
    "Library",
    "Application Support",
    "Epic",
    "EpicGamesLauncher",
    "Data",
  );
