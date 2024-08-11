#!/usr/bin/env bun
/**
 * This file is gib: a TUI application which aims to automate installing BepInEx
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
 *   curl -fsSL https://cdn.jsdelivr.net/gh/toebeann/gib/gib.sh | bash
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
  chmod,
  copyFile,
  readFile,
  stat,
  writeFile,
} from "node:fs/promises";
import { EOL } from "node:os";
import { basename, dirname, extname, join, sep } from "node:path";
import { exit, platform } from "node:process";
import chalk from "chalk";
import { watch } from "chokidar";
import clipboard from "clipboardy";
import cliWidth from "cli-width";
import findProcess from "find-process";
import fs from "fs-extra";
import { Glob } from "glob";
import open from "open";
import terminalLink from "terminal-link";
import wrapAnsi from "wrap-ansi";
import { renderLogo } from "./renderLogo.ts";
import "./polyfills/index.ts";
import { findPlistPath } from "../utils/findPlistPath.ts";
import { hasUnityAppIndicators } from "../unity/hasUnityAppIndicators.ts";
import unquote from "unquote";
import { getFixedPath } from "../utils/getFixedPath.ts";

const ensureDir = fs.ensureDir;

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

const err = chalk.redBright("Error:");

if (platform !== "darwin") {
  error(
    wrap(
      `${err} detected platform ${chalk.yellow(platform)}`,
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
  alert(wrap(chalk.yellowBright(`Press enter ${message}`)));
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
    "First, we need to know the location of your unzipped copy of the BepInEx pack inside your Downloads folder.",
  ),
);

const getInput = async (
  message: string,
  validator:
    | ((value: string) => string | false)
    | ((value: string) => Promise<string | false>),
  defaultValue?: string,
) => {
  let value: string | undefined;

  do {
    value = defaultValue !== undefined
      ? prompt(message, defaultValue)?.trim()
      : prompt(message)?.trim();

    if (!value) {
      error(
        wrap(
          `${EOL}${err} No input detected. If you would like to exit gib, press ${
            code(`Control C`)
          }. Otherwise, please try again.`,
        ),
      );
      continue;
    }

    value = await validator(value) || "";
  } while (!value);

  return value;
};

const copyPath = code("⌥ ⌘ C");
const paste = code("⌘ V");
const copyPathVerbose = code("Option Command C");
const pasteVerbose = code("Command V");

const getInvalidPathError = (path: string) =>
  wrap(
    `${EOL}${err} Could not find path:${EOL}${
      pink(path)
    }${EOL}${EOL}Please try using ${copyPathVerbose} to copy the path from Finder, then ${pasteVerbose} to paste it here.`,
  );

const getUnknownErrorCheckingPath = (path: string) =>
  wrap(
    `${EOL}${err} Unknown error checking path:${EOL}${pink(path)}`,
  );

const getInvalidBepInExPackError = () =>
  wrap(
    `${EOL}${err} ${run_bepinex_sh} script does not appear to be located within a valid BepInEx pack.`,
  );

const getNotAFolderError = (path: string) =>
  wrap(
    `${EOL}${err} Path is not a folder:${EOL}${pink(path)}`,
  );

const providePathInstructions = list([
  `Drag it into this window, or`,
  `Select it and press ${copyPath} to copy the path to the script file, then press ${paste} to paste it here.`,
], false);

const bepinexPath = dirname(
  await getInput(
    `${EOL}${
      wrap(
        `Open the Finder window with your copy of BepInEx, locate the ${run_bepinex_sh} script file, then either:`,
      )
    }${EOL}${EOL}${providePathInstructions}${EOL}${EOL}${
      wrap(`Enter the path here then ${code("press enter")}:`)
    }`,
    async (value) => {
      const input = unquote(value);
      const path = await getFixedPath(input);

      if (!path) {
        error(getInvalidPathError(input));
        return false;
      }

      const filename = basename(path);
      if (filename.toLowerCase() !== "run_bepinex.sh") {
        error(
          wrap(
            `${EOL}${err} Unexpected filename:${EOL}${
              pink(filename)
            }${EOL}${EOL}If you are absolutely sure this is a valid ${run_bepinex_sh} script, rename it to ${run_bepinex_sh} and try again.`,
          ),
        );
        return false;
      }

      try {
        if (!(await stat(path)).isFile()) {
          error(
            wrap(
              `${EOL}${err} Path is not a file:${EOL}${
                pink(path)
              }${EOL}${EOL}Please make sure you are selecting the ${run_bepinex_sh} script and try again.`,
            ),
          );
          return false;
        }
      } catch {
        error(getUnknownErrorCheckingPath(path));
        return false;
      }

      try {
        if (!(await stat(join(path, "..", "doorstop_libs"))).isDirectory()) {
          error(getInvalidBepInExPackError());
          return false;
        }
      } catch {
        error(getInvalidBepInExPackError());
        error(getUnknownErrorCheckingPath(join(path, "..", "doorstop_libs")));
        return false;
      }

      return path;
    },
  ),
);

log();
log(
  wrap(
    "Next, we need to know the location of the Unity game.",
  ),
);

const pleaseSelectAUnityGameAndTryAgain =
  "Please make sure you are selecting a Unity game app and try again.";

const gameAppPath = await getInput(
  `${EOL}${
    wrap(
      `Open the Finder window where your Unity game is located, find the app (e.g. ${
        code("Subnautica.app")
      }) and do the same thing as last time - either:`,
    )
  }${EOL}${EOL}${providePathInstructions}${EOL}${EOL}${
    wrap(`Enter the path here then ${code("press enter")}:`)
  }`,
  async (value) => {
    const input = unquote(value);
    const path = await getFixedPath(input);

    if (!path) {
      error(getInvalidPathError(input));
      return false;
    }

    if (extname(path).toLowerCase() !== ".app") {
      error(
        wrap(
          `${EOL}${err} Invalid app extension:${EOL}${
            pink(basename(path))
          }${EOL}${EOL}${pleaseSelectAUnityGameAndTryAgain}`,
        ),
      );
      return false;
    }

    try {
      if (!(await stat(path)).isDirectory()) {
        error(
          `${getNotAFolderError(path)}${EOL}${EOL}${
            wrap(pleaseSelectAUnityGameAndTryAgain)
          }`,
        );
        return false;
      }
    } catch {
      error(getUnknownErrorCheckingPath(path));
      return false;
    }

    const plist = await findPlistPath(path);
    if (!plist) {
      error(
        wrap(
          `${EOL}${err} Could not find app plist for app:${EOL}${
            pink(path)
          }${EOL}${EOL}${pleaseSelectAUnityGameAndTryAgain}`,
        ),
      );
      return false;
    }

    if (!await hasUnityAppIndicators(plist)) {
      error(
        wrap(
          `${EOL}${err} App does not appear to be a Unity game:${EOL}${
            pink(path)
          }${EOL}${EOL}BepInEx only works for Unity games. ${pleaseSelectAUnityGameAndTryAgain}`,
        ),
      );
      return false;
    }

    return path;
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

if (!confirm(wrap(chalk.yellowBright("Proceed?")))) {
  error(wrap(`${err} User cancelled installation.`));
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
      `${err} Timed out waiting for the game to launch. Test cancelled.`,
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
      `${err} Failed to detect BepInEx. Did you forget to set Steam launch options?`,
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
