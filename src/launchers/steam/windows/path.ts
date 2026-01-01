// import { homedir } from "node:os";
// import { join } from "node:path";
// import { enumerateValues, HKEY, RegistryValueType } from "registry-js";

// /** Retrieves the path to the Steam installation. */
// export const getSteamPath = () =>
//   enumerateValues(
//     HKEY.HKEY_LOCAL_MACHINE,
//     String.raw`SOFTWARE\WOW6432Node\Valve\Steam`,
//   )
//     .concat(
//       enumerateValues(
//         HKEY.HKEY_LOCAL_MACHINE,
//         String.raw`SOFTWARE\Valve\Steam`,
//       ),
//     )
//     .find((entry) =>
//       entry.name === "InstallPath" && entry.type === RegistryValueType.REG_SZ
//     )
//     ?.data as string | undefined ?? homedir();

// /** Retrieves the path to Steam's `libraryfolders.vdf` file. */
// export const getLibraryFoldersPath = () =>
//   join(getSteamPath(), "steamapps", "libraryfolders.vdf");

// /** Retrieves the path to Steam's `loginusers`.vdf` file. */
// export const getLoginUsersPath = () =>
//   join(getSteamPath(), "config", "loginusers.vdf");
