import { homedir } from "os";
import { enumerateValues, HKEY, RegistryValueType } from "registry-js";

export const getSteamPath = () =>
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
    ?.data as string | undefined ?? homedir();
