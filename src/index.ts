#!/usr/bin/env node --experimental-strip-types --no-warnings=ExperimentalWarning
/**
 * This file is gib: a node script which aims to automate installing BepInEx
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
 *   curl -fsSL https://cdn.jsdelivr.net/gh/toebeann/gib/gib.sh | sh
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

import { writeSync } from "node:fs";
import {
  access,
  chmod,
  constants,
  copyFile,
  readFile,
  stat,
  writeFile,
} from "node:fs/promises";
import { EOL } from "node:os";
import { basename, dirname, extname, join, sep } from "node:path";
import { exit, platform, stdout } from "node:process";
import chalk from "chalk";
import { watch } from "chokidar";
import clipboard from "clipboardy";
import cliWidth from "cli-width";
import findProcess from "find-process";
import fs from "fs-extra";
import { Glob } from "glob";
import open from "open";
import readlineSync from "readline-sync";
import terminalLink from "terminal-link";
import { match, P } from "ts-pattern";
import wrapAnsi from "wrap-ansi";
import { renderLogo } from "./cli/renderLogo.js";
import { findPlistPath } from "./utils/findPlistPath.js";
import { hasUnityAppIndicators } from "./unity/hasUnityAppIndicators.js";

const ensureDir = fs.ensureDir;

function alertShim(message: string) {
  writeSync(stdout.fd, new TextEncoder().encode(`${message} [Enter] `));
  readlineSync.question();
}

function confirmShim(message: string) {
  writeSync(stdout.fd, new TextEncoder().encode(`${message} [y/N] `));
  const result = readlineSync.question();
  return ["y", "Y"].includes(result);
}

function promptShim(message = "Prompt", defaultValue?: string) {
  writeSync(
    stdout.fd,
    new TextEncoder().encode(
      `${message}${defaultValue ? ` [${defaultValue}]` : ""} `,
    ),
  );
  const result = readlineSync.question();
  return result.length > 0
    ? result
    : defaultValue !== null && defaultValue !== void 0
    ? defaultValue
    : null;
}

const pink = chalk.hex("#ae0956");
const code = chalk.yellowBright;

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

if (platform !== "darwin") {
  error(
    wrap(
      `${chalk.redBright("Error:")} detected platform ${
        chalk.yellow(platform)
      }`,
    ),
  );
  error(
    wrap(`Currently only ${chalk.yellow("darwin")} (macOS) is supported.`),
  );
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
        } or ${
          link(
            "Thunderstore Mod Manager",
            "https://www.overwolf.com/oneapp/Thunderstore-Thunderstore_Mod_Manager",
            "http://tinyurl.com/2kbt393c",
          )
        } are recommended for automated installation on Windows.`,
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
      } for manual installation instructions.`,
    ),
  );

  exit(1);
}

const run_bepinex_sh = code("run_bepinex.sh");
log(wrap("gib will:"));
if (width() < 40) log();
log(
  list([
    chalk.green("install and configure BepInEx for a compatible game"),
    chalk.green(
      "walk you through configuring Steam to launch the game with BepInEx",
    ),
    chalk.green("test that BepInEx is working"),
  ], false),
);

const pressHeartToContinue = (message = "to continue") => {
  log();
  alertShim(wrap(chalk.yellowBright(`Press enter ${message}`)));
  log();
};

pressHeartToContinue();

log(wrap("Before using gib, make sure that you have:"));
log();
log(
  list([
    "downloaded and unzipped the relevant BepInEx pack for the game to your Downloads folder, with a Finder window open at its location",
    `have a Finder window open at the location of the Unity game, e.g. by clicking ${
      chalk.italic("Manage -> Browse local files")
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
    value = promptShim(message, defaultValue)?.trim();
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
          chalk.yellowBright("press enter")
        }:`,
      ], true)
    }`,
    async (value) => {
      if (basename(value).toLowerCase() !== "run_bepinex.sh") {
        return false;
      }

      try {
        const [shellStats, doorstopStats] = await Promise.all([
          stat(value),
          stat(join(value, "..", "doorstop_libs")),
          access(value, constants.R_OK),
          access(join(value, "..", "doorstop_libs"), constants.R_OK),
        ]);
        return shellStats.isFile() && doorstopStats.isDirectory();
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
        chalk.yellowBright("press enter")
      }:`,
    ], true)
  }`,
  async (value) => {
    if (extname(value).toLowerCase() !== ".app") {
      return false;
    }

    try {
      return extname(value).toLowerCase() === ".app" &&
        (await stat(value)).isDirectory() &&
        await match(await findPlistPath(value))
          .returnType<Promise<boolean>>()
          .with(P.string, (plist: string) => hasUnityAppIndicators(plist))
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
    chalk.bold.yellowBright(
      "This operation will potentially overwrite files in the process.",
    ),
  ),
);
log();
log(wrap("You may be required to grant permission to the Terminal."));
log();

if (!confirmShim(wrap(chalk.yellowBright("Proceed?")))) {
  error(chalk.redBright("Error:"), "User cancelled installation.");
  exit(1);
}

const i = bepinexPath.split(sep).length;
for await (
  const path of new Glob("/**/*", {
    absolute: true,
    dot: true,
    ignore: "/**/.DS_Store",
    nodir: true,
    root: bepinexPath,
  })
) {
  const destination = join(gamePath, path.split(sep).slice(i).join(sep));
  await ensureDir(dirname(destination));
  await copyFile(path, destination);

  if (basename(path) === "run_bepinex.sh" && dirname(path) === bepinexPath) {
    const bepinexScriptContents = await readFile(destination, {
      encoding: "utf8",
    });
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
      await writeFile(destination, output, { encoding: "utf8" });
    }

    await chmod(destination, 0o764);
  }
}

const launchOptions = `"${gamePath}${sep}run_bepinex.sh" %command%`;
await clipboard.write(launchOptions);

log();
log(wrap("Now let's set the Steam launch options for the game:"));
log();
log(
  list([
    `In Steam, right-click the game and click ${
      chalk.italic("Manage -> Properties...")
    }`,
    `Select the ${
      chalk.italic("launch options")
    } field and press ${paste} to paste the following line${EOL}${
      chalk.bold("(no need to copy - it's already in your 📋 clipboard!)")
    }${EOL}${EOL}${pink(launchOptions)}`,
    "Close the Steam properties for the game",
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

var { detectedGame, detectedBepInEx } = await new Promise<
  { detectedGame: boolean; detectedBepInEx: boolean }
>(
  (resolve) => {
    const watcher = watch(join(gamePath, "BepInEx", "LogOutput.log"), {
      disableGlobbing: true,
      ignoreInitial: true,
      ignorePermissionErrors: true,
    });
    let detectedGame = false, detectedBepInEx = false;
    const finish = async () => {
      await watcher.removeAllListeners().close();
      clearTimeout(timeout);
      clearInterval(interval);
      resolve({ detectedGame, detectedBepInEx });
    };
    let timeout = setTimeout(finish, 300_000);

    const interval = setInterval(async () => {
      const app = await findProcess("name", basename(gameAppPath));

      if (!detectedGame && app.length) {
        clearTimeout(timeout);
        detectedGame = true;
        timeout = setTimeout(finish, 300_000);
        log(`${EOL}${code(basename(gameAppPath))}`, "running...");
      } else if (detectedGame && !app.length) {
        log(code(basename(gameAppPath)), "closed.");
        await finish();
      }
    }, 200);

    const handleChange = async () => {
      detectedBepInEx = true;
      await watcher.removeAllListeners().close();
    };

    watcher
      .on("add", handleChange)
      .on("change", handleChange);
  },
);

log();

if (!detectedGame && !detectedBepInEx) {
  error(
    wrap(
      `${
        chalk.redBright("Error:")
      } Timed out waiting for the game to launch. Test cancelled.`,
    ),
  );
  error(wrap("Unable to verify whether BepInEx is correctly installed."));
  error(
    wrap(
      "We recommend running gib again, making sure to run the right game.",
    ),
  );
  exit(1);
} else if (!detectedBepInEx) {
  error(
    wrap(
      `${
        chalk.redBright("Error:")
      } Failed to detect BepInEx. Did you forget to set Steam launch options?`,
    ),
  );
  error(
    wrap(
      "We recommend running gib again, making sure to pay attention to the section for setting the launch options for the game in Steam.",
    ),
  );
  exit(1);
} else {
  await open("https://github.com/toebeann/gib/?sponsor=1", {
    background: true,
  });

  log(wrap(chalk.green("Successfully detected BepInEx running!")));
  log();
  log(wrap("Congratulations, you're now ready to go wild installing mods!"));
  log();
  log(wrap("If you found gib helpful, please consider donating:"));
  log();
  log(
    list([
      link(
        chalk.hex("#00457C")("PayPal"),
        "https://paypal.me/tobeyblaber",
      ),
      link(
        chalk.hex("#ff5e5b")("Ko-fi"),
        "https://ko-fi.com/toebean_",
      ),
      link(
        chalk.hex("#4078c0")("GitHub"),
        "https://github.com/sponsors/toebeann",
      ),
    ], false),
  );
  log();
  log(pink("- tobey ♥"));
  log();
}
