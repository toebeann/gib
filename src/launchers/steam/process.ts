import { isAbsolute, relative } from "node:path";
import { kill as _kill } from "node:process";
import { waitUntil } from "async-wait-until";
import findProcess from "find-process";
import open from "open";
import { getSteamPath } from "./path.ts";

/** Get running Steam processes, if any. */
export const getProcess = () =>
  findProcess("name", "steam")
    .then((processes) =>
      processes.filter((process) => {
        const path = getSteamPath();
        if (process.ppid !== undefined && process.ppid !== 1) return false;
        if (
          !("bin" in process) || typeof process.bin !== "string"
        ) return false;
        const { bin } = process;
        const relativePath = relative(path, bin);
        return relativePath && !relativePath.startsWith("..") &&
          !isAbsolute(relativePath);
      })
    );

/** Checks whether Steam appears to be running. */
export const isOpen = () => getProcess().then((process) => process.length > 0);

/** Attempts to kill all running Steam processes. */
export const quit = async () => {
  if (await isOpen()) {
    await open("steam://exit");
    try {
      await waitUntil(async () => !await isOpen(), { timeout: 10_000 });
      return true;
    } catch {
      console.log("timed out!");
      const processes = await getProcess();
      return processes.every((process) => _kill(process.pid, "SIGKILL"));
    }
  } else {
    const processes = await getProcess();
    return processes.every((process) => _kill(process.pid, "SIGKILL"));
  }
};
