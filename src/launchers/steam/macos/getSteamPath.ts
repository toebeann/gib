import { homedir } from "node:os";
import { join } from "node:path";

export const getSteamPath = () =>
  join(
    homedir(),
    "Library",
    "Application Support",
    "Steam",
  );
