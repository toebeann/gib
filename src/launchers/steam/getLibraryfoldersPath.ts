import { match } from "ts-pattern";
import { getLibraryfoldersPath as linux } from "./linux/getLibraryfoldersPath.js";
import { getLibraryfoldersPath as mac } from "./macos/getLibraryfoldersPath.js";
import { getLibraryfoldersPath as win } from "./windows/getLibraryfoldersPath.js";

export const getLibraryfoldersPath = match(process.platform)
  .returnType<() => string>()
  .with("linux", () => linux)
  .with("darwin", () => mac)
  .with("win32", () => win)
  .otherwise(() => () => "");
