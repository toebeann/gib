import { homedir } from "node:os";
import { join } from "node:path";
import { getSteamPath } from "./getSteamPath.ts";

export const getLoginUsersPath = () =>
  join(getSteamPath() ?? homedir(), "config", "loginusers.vdf");
