import { isProtocolHandlerRegistered } from "../../utils/isProtocolHandlerRegistered.ts";

/**
 * Determines whether Steam appears to be installed by checking for a
 * `steam://` protocol handler. May open Steam in the background if it is
 * installed.
 */
export const isInstalled = () => isProtocolHandlerRegistered("steam");
