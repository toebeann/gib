import { match } from "ts-pattern";
import { getAppDataPath as mac } from "./macos/getAppDataPath.ts";
import { getAppDataPath as win } from "./windows/getAppDataPath.ts";

export const getAppDataPath = match(process.platform)
  .returnType<() => string>()
  .with("darwin", () => mac)
  .with("win32", () => win)
  .otherwise(() => () => "");
