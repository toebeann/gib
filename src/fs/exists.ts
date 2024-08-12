import { access } from "node:fs/promises";

/**
 * Determines whether the given path exists in the file system.
 * @param path
 */

export const exists = async (path: string) =>
  access(path).then((_) => true).catch((_) => false);
