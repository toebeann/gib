import { $ } from "bun";

import { platform } from "node:process";

/**
 * Determines whether an app is registered to handle a given protocol.
 *
 * @param protocol The protocol to check for.
 */
export const isProtocolHandlerRegistered = async (protocol: string) => {
  if (platform === "darwin") {
    const output = await $`osascript -l JavaScript -e "ObjC.import('AppKit');
    $.NSWorkspace.sharedWorkspace.URLForApplicationToOpenURL($.NSURL.URLWithString('${protocol}://'))?.path.js;"`
      .nothrow()
      .text();
    return Boolean(output.length);
  }
  return false;
};
