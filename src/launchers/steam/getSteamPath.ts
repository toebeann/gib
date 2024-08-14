import { match } from "ts-pattern";
import { getSteamPath as mac } from "./macos/getSteamPath.ts";
import { getSteamPath as win } from "./windows/getSteamPath.ts";

export const getSteamPath = match(process.platform)
  .returnType<() => string>()
  .with("darwin", () => mac)
  .with("win32", () => win)
  .otherwise(() => () => "");
