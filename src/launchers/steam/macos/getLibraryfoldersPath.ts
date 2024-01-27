import { homedir } from "node:os";
import { join } from "node:path";

export const getLibraryfoldersPath = () =>
  join(
    homedir(),
    "Library",
    "Application Support",
    "Steam",
    "config",
    "libraryfolders.vdf",
  );
