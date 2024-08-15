import { homedir } from "node:os";
import { join } from "node:path";

/** Retrieves the path to Steam's `libraryfolders.vdf` file. */
export const getLibraryfoldersPath = () => join(homedir(), ".steam", "root");
