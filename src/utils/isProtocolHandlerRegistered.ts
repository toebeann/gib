import ProtocolRegistry from "protocol-registry";
import { match } from "ts-pattern";
import { isProtocolHandlerRegistered as win } from "./windows/isProtocolHandlerRegistered.js";

/**
 * Determines whether a handler for a given protocol is registered.
 *
 * @param protocol The protocol to check for.
 */
export const isProtocolHandlerRegistered = match(process.platform)
  .returnType<(protocol: string) => Promise<boolean>>()
  .with("win32", () => (protocol) => Promise.resolve(win(protocol)))
  .otherwise(() => ProtocolRegistry.checkifExists);
