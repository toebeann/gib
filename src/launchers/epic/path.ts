import { match } from "ts-pattern";
import { getAppDataPath as mac } from "./macos/path.ts";
import { getAppDataPath as win } from "./windows/path.ts";

/**
 * Retrieves the path to the Epic Games Launcher's AppData folder on this
 * computer.
 */
export const getAppDataPath = match(process.platform)
  .returnType<() => string>()
  .with("darwin", () => mac)
  .with("win32", () => win)
  .otherwise(() => () => "");
