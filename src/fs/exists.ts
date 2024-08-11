import { access } from "node:fs/promises";

/**
 * Determines whether the given path exists in the file system.
 * @param path
 */
export const exists = async (path: string) => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};
