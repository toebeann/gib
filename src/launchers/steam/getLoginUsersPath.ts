import { match } from "ts-pattern";
import { getLoginUsersPath as mac } from "./macos/getLoginUsersPath.ts";
import { getLoginUsersPath as win } from "./windows/getLoginUsersPath.ts";

export const getLoginUsersPath = match(process.platform)
  .returnType<() => string>()
  .with("darwin", () => mac)
  .with("win32", () => win)
  .otherwise(() => () => "");
