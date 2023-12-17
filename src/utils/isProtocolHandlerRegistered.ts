import { homedir, join, match, P, z } from "../deps.ts";

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
 * Requires permissions:
 * - `allow-env=HOME`
 * - `allow-run=plutil,open`
 *
 * @param protocol The protocol to check for.
 */
export const isProtocolHandlerRegistered = async (protocol: string) =>
  match(
    await new Deno.Command("plutil", {
      args: [
        "-convert",
        "json",
        "-o",
        "-",
        join(
          homedir(),
          "Library",
          "Preferences",
          "com.apple.LaunchServices",
          "com.apple.launchservices.secure.plist",
        ),
      ],
    }).output(),
  )
    .returnType<boolean | Promise<boolean>>()
    .when(({ success, stdout }) => {
      try {
        return !success ||
          !(parseLaunchServices(launchServicesSecureSchema.parse(
            JSON.parse(new TextDecoder().decode(stdout)),
          ))
            .map((entry) => entry.LSHandlerURLScheme)
            .filter(Boolean)
            .includes(protocol));
      } catch {
        return true;
      }
    }, async () =>
      (await new Deno.Command("open", {
        args: ["--background", `${protocol}://`],
      }).output()).success)
    .otherwise(() => true);
