// import { enumerateValues, HKEY, RegistryValueType } from "registry-js";

// export const isProtocolHandlerRegistered = (protocol: string) =>
//   enumerateValues(HKEY.HKEY_CLASSES_ROOT, protocol)
//     .concat(
//       enumerateValues(HKEY.HKEY_CURRENT_USER, `Software\\Classes\\${protocol}`),
//     )
//     .some((entry) =>
//       entry.name === "URL Protocol" && entry.type === RegistryValueType.REG_SZ
//     );
