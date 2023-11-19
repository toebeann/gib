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
 *   PATH="$HOME/.deno/bin:$PATH" && deno run --allow-env
 *   --allow-run=deno,pbcopy,/bin/sh --allow-read --allow-sys=uid --allow-write
 *   --reload=https://cdn.jsdelivr.net/gh/toebeann/gib/mod.ts
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

const version = "0.0.2";

// --allow-env
import chalk, { supportsColor } from "npm:chalk";

const pink = chalk.hex("#AE0956");
const code = supportsColor && supportsColor.has16m
  ? chalk.bgHex("#6e768166")
  : chalk.italic.underline;

const { error, log } = console;

log();
log(pink("/======================================\\"));
log(pink(`| tobey's Guided Installer for BepInEx |`));
log(pink("\\======================================/"));
log();

// --allow-run=deno
const { stdout } = await (new Deno.Command("deno", { args: ["--version"] }))
  .output();
log(chalk.gray(`gib ${version}`));
log(chalk.gray(new TextDecoder().decode(stdout)));

import { platform } from "node:process";

if (platform !== "darwin") {
  error(chalk.red("Error:"), "detected platform", chalk.yellow(platform));
  error("Currently only", chalk.yellow("darwin"), "(macOS) is supported.");
  log();

  if (platform === "win32") {
    log(
      "For automated BepInEx installation on Windows, I recommended Vortex:",
    );
    log("  https://www.nexusmods.com/about/vortex/");
    log();
  }

  log(
    "To install BepInEx for other supported platforms, follow the instructions in",
  );
  log("the BepInEx documentation:");
  log(
    "  https://docs.bepinex.dev/articles/user_guide/installation/index.html",
  );

  Deno.exit(1);
}

log("gib will:");
log();
log("  •", chalk.green("install BepInEx to the game folder specified"));
log("  •", chalk.green("configure the run_bepinex.sh script if needed"));
log("  •", chalk.green("take care of macOS permissions issues"));
log(
  "  •",
  chalk.green(
    "walk you through configuring Steam to launch the game with BepInEx",
  ),
);
log("  •", chalk.green("test that BepInEx is working"));
if (supportsColor && supportsColor.has16m) {
  log("  •", chalk.strikethrough("make you a cup of tea"));
}

const pressHeartToContinue = (message = "to continue") => {
  log();
  alert(chalk.yellow(`Press enter ${message}`));
  log();
};

pressHeartToContinue();

import { EOL } from "node:os";

log("Before using gib, make sure that you have:");
log();
log(
  "  1. downloaded and unzipped the relevant BepInEx pack for the game to your",
  EOL,
  "    Downloads folder, and have a Finder window open at its location",
);
log();
log(
  "  2. have a Finder window open at the location of the Unity game," + EOL +
    "     e.g. by clicking",
  chalk.italic("Manage -> Browse local files"),
  "in Steam",
);
log();
log(
  "Additionally, if you don't own the game with Steam, make sure to add it to",
);
log("Steam as a non-Steam game. Instructions can be found here:");
log(
  "  ",
  chalk.underline(
    "https://github.com/toebeann/gib/wiki/Adding-non%E2%80%90Steam-games-to-Steam",
  ),
);

pressHeartToContinue();

const run_bepinex_sh = code("run_bepinex.sh");

log(
  "First, we need to know the location of your unzipped copy of the BepInEx pack",
);
log("inside your Downloads folder:");

const prompt = async (
  message: string,
  validator: (value: string) => boolean | Promise<boolean>,
  defaultValue?: string,
) => {
  let value: string | undefined;

  do {
    value = globalThis.prompt(message, defaultValue)?.trim();
  } while (!value || !(await validator(value)));

  return value;
};

import { exists } from "https://deno.land/std@0.206.0/fs/mod.ts";
import {
  basename,
  dirname,
  join,
} from "https://deno.land/std@0.206.0/path/mod.ts";

const copyPath = code("⌥ ⌘ C");
const paste = code("⌘ V");

const bepinexPath = dirname(
  await prompt(
    `${EOL}  1. Open the Finder window with your copy of BepInEx, find the ${run_bepinex_sh}${EOL}` +
      `     script, select it and press ${copyPath} to copy the path${EOL}${EOL}` +
      `  2. Press ${paste} here to paste the path, and ${
        chalk.yellow("press enter")
      }:`,
    async (value) => {
      try {
        // --allow-read --allow-sys=uid
        return basename(value).toLowerCase() == "run_bepinex.sh" &&
          await exists(value, { isFile: true, isReadable: true }) &&
          await exists(join(dirname(value), "doorstop_libs"), {
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
  "Next, we need to know the location of the Unity game which you would like to",
);
log("install BepInEx to:");

import { extname } from "https://deno.land/std@0.206.0/path/mod.ts";

const gameAppPath = await prompt(
  `${EOL}  1. Open the Finder window where your Unity game is located, find the app${EOL}` +
    `     (e.g. ${
      code("Subnautica.app")
    }), select it and press ${copyPath} to copy the path${EOL}${EOL}` +
    `  2. Then, press ${paste} here to paste the path, and ${
      chalk.yellow("press enter")
    }:`,
  async (value) => {
    try {
      // --allow-read --allow-sys=uid
      return extname(value).toLowerCase() === ".app" &&
        await exists(value, { isDirectory: true, isReadable: true }) &&
        (await exists(
          join(value, "Contents", "Frameworks", "UnityPlayer.dylib"),
          { isFile: true },
        ) ||
          await exists(
            join(
              value,
              "Contents",
              "Resources",
              "Data",
              "Managed",
              "Assembly-CSharp.dll",
            ),
            { isFile: true },
          ));
    } catch {
      return false;
    }
  },
);
const gamePath = dirname(gameAppPath);

log();
log("gib will now install the macOS BepInEx pack located at:");
log(pink(bepinexPath));
log("to the Unity game located at:");
log(pink(gamePath));
log();
log(
  chalk.yellow.bold(
    "This operation will potentially overwrite files in the process.",
  ),
);
log();
log("You may be required to grant permission to the Terminal.");
log();

if (!confirm(chalk.yellow("Proceed?"))) {
  error(chalk.red("Error:"), "User cancelled installation.");
  Deno.exit(1);
}

import { ensureDir, walk } from "https://deno.land/std@0.206.0/fs/mod.ts";
import { sep } from "https://deno.land/std@0.206.0/path/mod.ts";

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

// --allow-run=pbcopy
import Clipboard from "https://deno.land/x/clipboard@v0.0.2/mod.ts";
const launchOptions = `"${gamePath}${sep}run_bepinex.sh" %command%`;
await Clipboard.writeText(launchOptions);

log();
log("Now let's set the Steam launch options for the game:");
log();
log(
  "  1. In Steam, right-click the game and click",
  chalk.italic("Manage -> Properties..."),
);
log();
log(
  "  2. Select the",
  chalk.italic("launch options"),
  `field and press ${paste} to paste the following line`,
);
log(
  `${
    chalk.bold("     (no need to copy - it's already in your 📋 clipboard!)")
  }:`,
);
log();
log("    ", pink(launchOptions));
log();
log("  3. Press escape to close the Steam properties for the game.");

pressHeartToContinue();

log("Finally, let's test that everything is working.");
pressHeartToContinue("when you're ready to run the test");
log(
  "Launch the game with Steam, then quit to desktop once you reach the main menu.",
);

// --allow-run=/bin/sh
import find from "npm:find-process@1";

const watcher = Deno.watchFs(join(gamePath));

let timeout = setTimeout(() => watcher.close(), 300_000);

let running = false, detectedGame = false;
const interval = setInterval(async () => {
  const app = await find("name", basename(gameAppPath));

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
  }
}

clearInterval(interval);
clearTimeout(timeout);

log();

if (!detectedGame && !detectedBepInEx) {
  error(
    chalk.red("Error:"),
    "Timed out waiting for the game to launch. Test cancelled.",
  );
  error("Unable to verify whether BepInEx is correctly installed.");
  error(
    "We recommend running gib again, making sure to run the right game.",
  );
  Deno.exit(1);
} else if (!detectedBepInEx) {
  error(
    chalk.red("Error:"),
    "Failed to detect BepInEx. Did you forget to set Steam launch options?",
  );
  error(
    "We recommend running gib again, making sure to pay attention to the section",
  );
  error("for setting the launch options for the game in Steam.");
  Deno.exit(1);
} else {
  log(chalk.green("Successfully detected BepInEx running!"));
  log();
  log("Congratulations, you're now ready to go wild installing mods!");
  log();
  log("If you found gib helpful, please consider donating:");
  log();
  log(
    "  •",
    chalk.hex("#00457C")("PayPal:"),
    chalk.underline("https://paypal.me/tobeyblaber"),
  );
  log();
  log(
    "  •",
    chalk.hex("#FF5E5B")("Ko-fi: "),
    chalk.underline("https://ko-fi.com/toebean_"),
  );
  log();
  log(
    "  •",
    chalk.hex("#4078c0")("GitHub:"),
    chalk.underline("https://github.com/sponsors/toebeann"),
  );
  log();
  log(pink("- tobey ♥"));
  log();
}
