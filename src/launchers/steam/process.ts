import { isAbsolute, relative } from "node:path";
import { kill as _kill } from "node:process";

import { waitUntil } from "async-wait-until";
import open from "open";

import { find } from "../../utils/process.ts";
import { getDataFolderPath } from "./path.ts";

/** Get running Steam processes, if any. */
export const get = async () => {
  const [dataPath, processes] = await Promise.all([
    getDataFolderPath(),
    find("name", "steam"),
  ]);
  return processes.filter((process) => {
    if (process.ppid !== undefined && process.ppid !== 1) return false;
    if (
      !("bin" in process) || typeof process.bin !== "string"
    ) return false;
    const { bin } = process;
    const relativePath = relative(dataPath, bin);
    return relativePath && !relativePath.startsWith("..") &&
      !isAbsolute(relativePath);
  });
};

/** Checks whether Steam appears to be running. */
export const isOpen = async () => (await get()).length > 0;

/** Attempts to kill all running Steam processes. */
export const quit = async () => {
  if (await isOpen()) {
    await open("steam://exit");
    try {
      await waitUntil(async () => !await isOpen(), { timeout: 10_000 });
      return true;
    } catch {
      console.log("timed out!");
      const processes = await get();
      return processes.every((process) => _kill(process.pid, "SIGKILL"));
    }
  } else {
    const processes = await get();
    return processes.every((process) => _kill(process.pid, "SIGKILL"));
  }
};
