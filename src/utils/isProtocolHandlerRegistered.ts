import { homedir } from "node:os";
import { join } from "node:path";
import { match, P } from "ts-pattern";
import { z } from "zod";
import { exec } from "../fs/exec.js";

const launchServicesHandlersSchema = z.object({
  LSHandlerURLScheme: z.string().optional(),
}).passthrough().array();

export const launchServicesSecureSchema = z.union([
  launchServicesHandlersSchema,
  z.object({
    LSHandlers: launchServicesHandlersSchema,
  }).passthrough(),
]);

const parseLaunchServices = (
  launchServices: z.infer<typeof launchServicesSecureSchema>,
) =>
  match(launchServices)
    .returnType<z.infer<typeof launchServicesHandlersSchema>>()
    .with(P.array(), (launchServices) => launchServices)
    .otherwise((obj) => obj.LSHandlers);

/**
 * Determines whether a handler for a given protocol is registered.
 *
 * Checks the launch services registered in
 * `$HOME/Library/Preferences/com.apple.LaunchServices/com.apple.launchservices.secure.plist`
 * first, and if not found there falls back checking with `open`, which opens
 * the handler for the given protocol in the background if one is registered.
 *
 * @param protocol The protocol to check for.
 */
export const isProtocolHandlerRegistered = async (protocol: string) => {
  let plutilOutput: string | undefined;
  try {
    const { stdout } = await exec(
      `plutil -convert json -o - "${
        join(
          homedir(),
          "Library",
          "Preferences",
          "com.apple.LaunchServices",
          "com.apple.launchservices.secure.plist",
        )
      }"`,
    );
    plutilOutput = stdout.trim();
  } catch {}

  if (plutilOutput) {
    const launchServices = launchServicesHandlersSchema.safeParse(
      JSON.parse(plutilOutput),
    );
    if (
      launchServices.success &&
      parseLaunchServices(launchServices.data).map((entry) =>
        entry.LSHandlerURLScheme
      ).filter(
        Boolean,
      ).includes(protocol)
    ) {
      return true;
    }
  }

  try {
    await exec(`open --background ${protocol}://`);
    return true;
  } catch {
    try {
      await exec(`open ${protocol}://`);
      return true;
    } catch {
      return false;
    }
  }
};
