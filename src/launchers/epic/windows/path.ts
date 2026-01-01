// import { join } from "node:path";
// import { env } from "node:process";
// import { enumerateValues, HKEY, RegistryValueType } from "registry-js";

// /**
//  * Retrieves the path to the Epic Games Launcher's AppData folder on this
//  * computer.
//  */
// export const getAppDataPath = () =>
//   enumerateValues(
//     HKEY.HKEY_LOCAL_MACHINE,
//     String.raw`SOFTWARE\WOW6432Node\Epic Games\EpicGamesLauncher`,
//   )
//     .concat(
//       enumerateValues(
//         HKEY.HKEY_LOCAL_MACHINE,
//         String.raw`SOFTWARE\Epic Games\EpicGamesLauncher`,
//       ),
//     )
//     .find((entry) =>
//       entry.name === "AppDataPath" && entry.type === RegistryValueType.REG_SZ
//     )?.data as string | undefined ??
//     join(
//       env.PROGRAMDATA ?? env.ALLUSERSPROFILE ?? join("C:", "ProgramData"),
//       "Epic",
//       "EpicGamesLauncher",
//       "Data",
//     );
