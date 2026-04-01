import { $ } from "bun";

import { platform } from "node:os" with { type: "macro" };
import { join } from "node:path";

import stringArgv from "string-argv";

/**
 * Determines whether an app is registered to handle a given protocol.
 *
 * @param protocol The protocol to check for.
 */
export const isProtocolHandlerRegistered = async (protocol: string) => {
  if (platform() === "darwin") {
    const path = await getProtocolHandlerPath(protocol);
    return path !== undefined && path.length > 0;
  } else if (platform() === "win32") {
    const key = join("registry::hkcr", protocol);
    const { exitCode } =
      await $`powershell -noprofile -noninteractive -c 'gp -path ${key} | select -expand "URL Protocol"'`
        .nothrow()
        .quiet();
    return exitCode === 0;
  } else return false;
};

/** Gets the default app registered to handle a given protocol. */
export const getProtocolHandlerPath = async (protocol: string) => {
  if (platform() === "darwin") {
    const output = await $`osascript -l JavaScript -e "ObjC.import('AppKit');
    $.NSWorkspace.sharedWorkspace.URLForApplicationToOpenURL($.NSURL.URLWithString('${protocol}://'))?.path.js;"`
      .nothrow()
      .text();
    return output.trim();
  } else if (platform() === "win32") {
    try {
      const key = join("registry::hkcr", protocol, "shell", "open", "command");
      const output =
        await $`powershell -noprofile -noninteractive -c 'gp -path ${key} | select -expand "(default)"'`
          .text();
      return stringArgv(output)[0];
    } catch {}
  }
};
