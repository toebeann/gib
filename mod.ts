/**
 * This file is gib: a deno script which aims to automate installing BepInEx
 * to a Unity game.
 *
 * Currently only macOS is supported, as the process of manual BepInEx
 * installation is exceptionally cumbersome on this operating system.
 *
 * gib aims to automate whatever it can, and hold the user's hand
 * through whatever it cannot.
 *
 * USAGE:
 *
 * Full usage instructions can be found in the README. gib itself will try to
 * guide you through usage, though it also attempts to be concise. Read the
 * README if you get stuck.
 *
 * Recommended command to run gib:
 *
 *   curl -fsSL https://cdn.jsdelivr.net/gh/toebeann/gib/bootstrap.sh | sh &&
 *   PATH="$HOME/.deno/bin:$PATH" && deno run -Ar
 *   https://cdn.jsdelivr.net/gh/toebeann/gib/mod.ts
 *
 ******************************************************************************
 *
 * ISC License
 *
 * Copyright 2023 Tobey Blaber
 *
 * Permission to use, copy, modify and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 *
 *****************************************************************************/

import {
  basename,
  blue,
  bold,
  brightBlue,
  brightMagenta,
  brightRed,
  brightYellow,
  Clipboard,
  cliWidth,
  dirname,
  ensureDir,
  EOL,
  exists,
  extname,
  findProcess,
  green,
  italic,
  join,
  magenta,
  match,
  open,
  P,
  platform,
  reset,
  rgb24,
  rgb8,
  sep,
  supportsColor,
  terminalLink,
  walk,
  wrapAnsi,
  yellow,
} from "./src/deps.ts";
import { renderLogo } from "./src/cli/renderLogo.ts";
import { findPlistPath } from "./src/utils/findPlistPath.ts";
import { hasUnityAppIndicators } from "./src/unity/hasUnityAppIndicators.ts";

// --allow-env
const pink = match(supportsColor.stdout)
  .returnType<(str: string) => string>()
  .with(
    { has16m: true },
    () => (str: string) => `${rgb24(str, 0xae0956)}${reset("")}`,
  )
  .with(
    { has256: true },
    () => (str: string) => `${rgb8(str, 125)}${reset("")}`,
  )
  .otherwise(() => brightMagenta);

const code = brightYellow;

const link = (
  label: string,
  url: string = label,
  short: string = url,
  options?: Parameters<typeof terminalLink>[2],
) =>
  terminalLink(label, url, {
    fallback: () => `${label} [ ${short} ]`,
    ...options,
  });

const width = () => cliWidth({ defaultWidth: 80 });

const wrap = (
  str: string,
  columns = width(),
  options?: Parameters<typeof wrapAnsi>[2],
) => wrapAnsi(str, columns, options);

const list = (items: string[], ordered: boolean) => {
  const padding = ordered ? items.length.toString().length + 2 : 3;
  const indent = ordered ? padding + 2 : 4;

  let output = "";
  for (const [index, item] of items.entries()) {
    const n = index + 1;
    output += `${ordered ? (`${n.toString().padStart(padding)}.`) : "  •"} ${
      wrap(item, width() - indent).split(EOL).join(
        `${EOL}${" ".repeat(indent)}`,
      )
    }`;

    if (n < items.length) {
      output += EOL.repeat(2);
    }
  }
  return output;
};

const { error, log } = console;

await renderLogo();

// allow-sys=osRelease
if (platform !== "darwin") {
  error(
    wrap(
      `${brightRed("Error:")} detected platform ${yellow(platform)}`,
    ),
  );
  error(wrap(`Currently only ${yellow("darwin")} (macOS) is supported.`));
  log();

  if (platform === "win32") {
    log(
      wrap(
        `${
          link(
            "Vortex Mod Manager",
            "https://www.nexusmods.com/about/vortex/",
            "https://tinyurl.com/3wjededw",
          )
        } is recommended for automated installation on Windows.`,
      ),
    );
    log();
  }
  log(
    wrap(
      `For all other platforms, please see ${
        link(
          "the BepInEx documentation",
          "https://docs.bepinex.dev/articles/user_guide/installation/index.html",
          "https://tinyurl.com/yzp3evma",
        )
      } for installation instructions.`,
    ),
  );

  Deno.exit(1);
}

const run_bepinex_sh = code("run_bepinex.sh");
log(wrap("gib will:"));
if (width() < 40) log();
log(
  list([
    green("install and configure BepInEx for a compatible game"),
    green(
      "walk you through configuring Steam to launch the game with BepInEx",
    ),
    green("test that BepInEx is working"),
  ], false),
);

const pressHeartToContinue = (message = "to continue") => {
  log();
  alert(wrap(brightYellow(`Press enter ${message}`)));
  log();
};

pressHeartToContinue();

log(wrap("Before using gib, make sure that you have:"));
log();
log(
  list([
    "downloaded and unzipped the relevant BepInEx pack for the game to your Downloads folder, with a Finder window open at its location",
    `have a Finder window open at the location of the Unity game, e.g. by clicking ${
      italic("Manage -> Browse local files")
    } in Steam`,
  ], true),
);
log();
log(
  wrap(
    `Additionally, if you don't own the game with Steam, make sure to ${
      link(
        "add it to Steam as a non-Steam game",
        "https://github.com/toebeann/gib/wiki/Adding-non%E2%80%90Steam-games-to-Steam",
        "https://tinyurl.com/ywvm782r",
      )
    }.`,
  ),
);

pressHeartToContinue();

log(
  wrap(
    "First, we need to know the location of your unzipped copy of the BepInEx pack inside your Downloads folder:",
  ),
);

const prompt = async (
  message: string,
  validator: (value: string) => boolean | Promise<boolean>,
  defaultValue?: string,
) => {
  let value: string | undefined;

  do {
    value = globalThis.prompt(message, defaultValue)?.trim();
  } while (!value || !await validator(value));

  return value;
};

const copyPath = code("⌥ ⌘ C");
const paste = code("⌘ V");

const bepinexPath = dirname(
  await prompt(
    `${EOL}${
      list([
        `Open the Finder window with your copy of BepInEx, find the ${run_bepinex_sh} script, select it and press ${copyPath} to copy the path to the script file`,
        `Press ${paste} here to paste the path, and ${
          brightYellow("press enter")
        }:`,
      ], true)
    }`,
    async (value) => {
      try {
        // --allow-read --allow-sys=uid
        return basename(value).toLowerCase() == "run_bepinex.sh" &&
          await exists(value, { isFile: true, isReadable: true }) &&
          await exists(join(value, "..", "doorstop_libs"), {
            isDirectory: true,
            isReadable: true,
          });
      } catch {
        return false;
      }
    },
  ),
);

log();
log(
  wrap(
    "Next, we need to know the location of the Unity game which you would like to install BepInEx to:",
  ),
);

const gameAppPath = await prompt(
  `${EOL}${
    list([
      `Open the Finder window where your Unity game is located, find the app (e.g. ${
        code("Subnautica.app")
      }), select it and press ${copyPath} to copy the path to the app`,
      `Then, press ${paste} here to paste the path and ${
        brightYellow("press enter")
      }:`,
    ], true)
  }`,
  async (value) => {
    try {
      // --allow-read --allow-sys=uid --allow-run=plutil
      return extname(value).toLowerCase() === ".app" &&
        await exists(value, { isDirectory: true, isReadable: true }) &&
        await match(await findPlistPath(value))
          .returnType<Promise<boolean>>()
          .with(P.string, (plist) => hasUnityAppIndicators(plist))
          .otherwise(() => Promise.resolve(false));
    } catch {
      return false;
    }
  },
);
const gamePath = dirname(gameAppPath);

log();
log(wrap("gib will now install the macOS BepInEx pack located at:"));
log(wrap(pink(bepinexPath)));
log(wrap("to the Unity game located at:"));
log(wrap(pink(gamePath)));
log();
log(
  wrap(
    bold(
      brightYellow(
        "This operation will potentially overwrite files in the process.",
      ),
    ),
  ),
);
log();
log(wrap("You may be required to grant permission to the Terminal."));
log();

if (!confirm(wrap(brightYellow("Proceed?")))) {
  error(brightRed("Error:"), "User cancelled installation.");
  Deno.exit(1);
}

const i = bepinexPath.split(sep).length;
for await (const item of walk(bepinexPath)) {
  if (item.isDirectory || item.name === ".DS_Store") continue;
  const destination = join(gamePath, item.path.split(sep).slice(i).join(sep));
  // --allow-write
  await ensureDir(dirname(destination));
  await Deno.copyFile(item.path, destination);

  if (item.name === "run_bepinex.sh" && dirname(item.path) === bepinexPath) {
    const bepinexScriptContents = await Deno.readTextFile(destination);
    let output = bepinexScriptContents;

    // check if line endings are CRLF and fix them if needed
    if (output.includes("\r\n")) {
      output = output.replaceAll("\r\n", "\n");
    }

    // check if the run_bepinex.sh needs to be configured, and configure it
    if (bepinexScriptContents.includes('\nexecutable_name=""')) {
      output = output.replace(
        '\nexecutable_name=""',
        `\nexecutable_name="${basename(gameAppPath)}"`,
      );
    }

    // write the changes, if any
    if (output !== bepinexScriptContents) {
      await Deno.writeTextFile(destination, output);
    }

    await Deno.chmod(destination, 0o764);
  }
}

const launchOptions = `"${gamePath}${sep}run_bepinex.sh" %command%`;
// --allow-run=pbcopy
await Clipboard.writeText(launchOptions);

log();
log(wrap("Now let's set the Steam launch options for the game:"));
log();
log(
  list([
    `In Steam, right-click the game and click ${
      italic("Manage -> Properties...")
    }`,
    `Select the ${
      italic("launch options")
    } field and press ${paste} to paste the following line${EOL}${
      bold("(no need to copy - it's already in your 📋 clipboard!)")
    }${EOL}${EOL}${pink(launchOptions)}`,
    "Press escape to close the Steam properties for the game",
  ], true),
);

pressHeartToContinue();

log(wrap("Finally, let's test that everything is working."));
pressHeartToContinue("when you're ready to run the test");
log(
  wrap(
    "Launch the game with Steam, then quit to desktop once you reach the main menu.",
  ),
);

const watcher = Deno.watchFs(join(gamePath));

let timeout = setTimeout(() => watcher.close(), 300_000);

let running = false, detectedGame = false;
const interval = setInterval(async () => {
  // --allow-run=/bin/sh
  const app = await findProcess("name", basename(gameAppPath));

  if (!running && app.length) {
    clearTimeout(timeout);
    detectedGame = running = true;
    timeout = setTimeout(() => watcher.close(), 300_000);
    log(`${EOL}${code(basename(gameAppPath))}`, "running...");
  } else if (running && !app.length) {
    running = false;
    clearInterval(interval);
    log(code(basename(gameAppPath)), "closed.");
    watcher.close();
  }
}, 200);

let detectedBepInEx = false;
for await (const event of watcher) {
  if (
    !detectedBepInEx &&
    event.kind === "modify" &&
    event.paths.includes(join(gamePath, "BepInEx", "LogOutput.log"))
  ) {
    detectedBepInEx = true;
    // --allow-run=open
    await open("https://github.com/toebeann/gib/?sponsor=1", {
      background: true,
    });
  }
}

clearInterval(interval);
clearTimeout(timeout);

log();

if (!detectedGame && !detectedBepInEx) {
  error(
    wrap(
      `${
        brightRed("Error:")
      } Timed out waiting for the game to launch. Test cancelled.`,
    ),
  );
  error(wrap("Unable to verify whether BepInEx is correctly installed."));
  error(
    wrap("We recommend running gib again, making sure to run the right game."),
  );
  Deno.exit(1);
} else if (!detectedBepInEx) {
  error(
    wrap(
      `${
        brightRed("Error:")
      } Failed to detect BepInEx. Did you forget to set Steam launch options?`,
    ),
  );
  error(
    wrap(
      "We recommend running gib again, making sure to pay attention to the section for setting the launch options for the game in Steam.",
    ),
  );
  Deno.exit(1);
} else {
  log(wrap(green("Successfully detected BepInEx running!")));
  log();
  log(wrap("Congratulations, you're now ready to go wild installing mods!"));
  log();
  log(wrap("If you found gib helpful, please consider donating:"));
  log();
  log(
    list([
      link(
        match(supportsColor.stdout).returnType<string>()
          .with(
            { has16m: true },
            () => `${rgb24("PayPal", 0x00457C)}${reset("")}`,
          )
          .with({ has256: true }, () => `${rgb8("PayPal", 18)}${reset("")}`)
          .otherwise(() => blue("PayPal")),
        "https://paypal.me/tobeyblaber",
      ),
      link(
        match(supportsColor.stdout).returnType<string>()
          .with(
            { has16m: true },
            () => `${rgb24("Ko-fi", 0xff5e5b)}${reset("")}`,
          )
          .with({ has256: true }, () => `${rgb8("Ko-fi", 167)}${reset("")}`)
          .otherwise(() => magenta("Ko-fi")),
        "https://ko-fi.com/toebean_",
      ),
      link(
        match(supportsColor.stdout).returnType<string>()
          .with(
            { has16m: true },
            () => `${rgb24("GitHub", 0x4078c0)}${reset("")}`,
          )
          .with({ has256: true }, () => `${rgb8("GitHub", 75)}${reset("")}`)
          .otherwise(() => brightBlue("GitHub")),
        "https://github.com/sponsors/toebeann",
      ),
    ], false),
  );
  log();
  log(pink("- tobey ♥"));
  log();
}
