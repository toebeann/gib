import ProtocolRegistry from "protocol-registry";

/**
 * Determines whether a handler for a given protocol is registered.
 *
 * @param protocol The protocol to check for.
 */
export const isProtocolHandlerRegistered = ProtocolRegistry.checkifExists;
