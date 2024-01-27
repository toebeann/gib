import { match } from "ts-pattern";
import { getAppDataPath as mac } from "./macos/getAppDataPath.js";
import { getAppDataPath as win } from "./windows/getAppDataPath.js";

export const getAppDataPath = match(process.platform)
  .returnType<() => string>()
  .with("darwin", () => mac)
  .with("win32", () => win)
  .otherwise(() => () => "");
