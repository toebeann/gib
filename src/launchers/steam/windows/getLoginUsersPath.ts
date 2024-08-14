import { join } from "node:path";
import { getSteamPath } from "./getSteamPath.ts";

export const getLoginUsersPath = () =>
  join(getSteamPath(), "config", "loginusers.vdf");
