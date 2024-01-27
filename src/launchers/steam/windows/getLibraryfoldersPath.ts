import { homedir } from "node:os";
import { join } from "node:path";
import { enumerateValues, HKEY, RegistryValueType } from "registry-js";

const getSteamPath = () =>
  enumerateValues(
    HKEY.HKEY_LOCAL_MACHINE,
    String.raw`SOFTWARE\WOW6432Node\Valve\Steam`,
  )
    .concat(
      enumerateValues(
        HKEY.HKEY_LOCAL_MACHINE,
        String.raw`SOFTWARE\Valve\Steam`,
      ),
    )
    .find((entry) =>
      entry.name === "InstallPath" && entry.type === RegistryValueType.REG_SZ
    )
    ?.data as string | undefined;

export const getLibraryfoldersPath = () =>
  join(getSteamPath() ?? homedir(), "steamapps", "libraryfolders.vdf");
