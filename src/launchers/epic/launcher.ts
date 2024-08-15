import { isProtocolHandlerRegistered } from "../../utils/isProtocolHandlerRegistered.ts";

/**
 * Determines whether Steam appears to be installed by checking for a
 * `com.epicgames.launcher://` protocol handler. May open Steam in the
 * background if it is installed.
 */
export const isInstalled = () =>
  isProtocolHandlerRegistered("com.epicgames.launcher");
