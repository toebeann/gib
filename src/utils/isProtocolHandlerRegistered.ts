import ProtocolRegistry from "protocol-registry";
import { isProtocolHandlerRegistered as win32 } from "./windows/isProtocolHandlerRegistered.ts";

/**
 * Determines whether a handler for a given protocol is registered.
 *
 * @param protocol The protocol to check for.
 */
export const isProtocolHandlerRegistered = process.platform === "win32"
  ? (protocol: string) => Promise.resolve(win32(protocol))
  : ProtocolRegistry.checkifExists;
