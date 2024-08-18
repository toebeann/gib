#!/usr/bin/env node --experimental-strip-types --no-warnings=ExperimentalWarning
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

import { Glob } from "bun";
import { writeSync } from "node:fs";
import {
  access,
  chmod,
  copyFile,
  readFile as readFileSDGsd,
  stat,
  writeFile,
} from "node:fs/promises";
import { EOL, homedir } from "node:os";
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  join,
  parse,
  relative,
  resolve,
  sep,
} from "node:path";
import { kill, platform, stdout } from "node:process";
import chalk from "chalk";
import { watch } from "chokidar";
import cliWidth from "cli-width";
import findProcess from "find-process";
import { ensureDir } from "fs-extra";
import open from "open";
import { build as buildPlist } from "plist";
import readlineSync from "readline-sync";
import { quote } from "shell-quote";
import terminalLink from "terminal-link";
import unquote from "unquote";
import wrapAnsi from "wrap-ansi";
import { renderLogo } from "./renderLogo.ts";
import { exec } from "../fs/exec.ts";
import { getAppsByPath, launch } from "../launchers/steam/app.ts";
import { isInstalled } from "../launchers/steam/launcher.ts";
import { isOpen, quit } from "../launchers/steam/process.ts";
import {
  addShortcut,
  getShortcuts,
  setShortcuts,
  type Shortcut,
} from "../launchers/steam/shortcut.ts";
import { hasUnityAppIndicators } from "../utils/unity.ts";
import { getFixedPath } from "../utils/getFixedPath.ts";
import { setLaunchOptions } from "../launchers/steam/launchOption.ts";
import { getMostRecentUser } from "../launchers/steam/loginusers.ts";
import { type Plist, readFile } from "../utils/plist.ts";

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
const code = chalk.yellowBright.bold;

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
  str: string | (string | null | undefined)[],
  columns = width(),
  options?: Parameters<typeof wrapAnsi>[2],
) => wrapAnsi(typeof str === "string" ? str : str.join(EOL), columns, options);

const list = (items: string[], ordered: boolean) => {
  const padding = ordered ? items.length.toString().length + 2 : 3;
  const indent = ordered ? padding + 2 : 4;

  let output = "";
  for (const [index, item] of items.entries()) {
    const n = index + 1;
    output += `${ordered ? (`${n.toString().padStart(padding)}.`) : "  •"} ${
      wrap(item, width() - indent)
        .split(EOL).join(
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
  throw wrap([
    `detected platform ${chalk.yellow(platform)}`,
    chalk.reset([
      `Currently only ${chalk.yellow("darwin")} (macOS) is supported.`,
      null,
      `For all other platforms, please see ${
        link(
          "the BepInEx documentation",
          "https://docs.bepinex.dev/articles/user_guide/installation/index.html",
          "https://tinyurl.com/yzp3evma",
        )
      } for manual installation instructions.`,
    ].join(EOL)),
  ]);
}

const run_bepinex_sh = code("run_bepinex.sh");
log(wrap(chalk.bold("gib will:")));
if (width() < 40) log();
log(
  list(
    [
      "install and configure BepInEx for a compatible game",
      "configure Steam to launch the game with BepInEx",
      "test that BepInEx is working",
    ].map((s) => chalk.green(s)),
    false,
  ),
);

const pressHeartToContinue = (message = "to continue") => {
  log();
  alertShim(wrap(chalk.yellowBright(`Press enter ${message}`)));
  log();
};

pressHeartToContinue();

log(
  wrap(
    "If you haven't already, go ahead and download (and unzip) the relevant " +
      "BepInEx pack for the game.",
  ),
);

const err = `${chalk.red("error")}${chalk.gray(":")}`;

const prompt = async (
  message: string,
  validator:
    | ((value: string) => string | false)
    | ((value: string) => Promise<string | false>),
  defaultValue?: string,
) => {
  let value: string | undefined;

  do {
    value = promptShim(message, defaultValue)?.trim();

    if (!value) {
      error(
        wrap(
          `${EOL}${err} No input detected. If you would like to exit gib, press ${
            code("Control C")
          }. Otherwise, please try again.`,
        ),
      );
      continue;
    }

    value = await validator(value) || "";
  } while (!value);

  return value;
};

const copyPath = code("Option Command C");
const paste = code("Command V");

const getInvalidPathError = (path: string) =>
  wrap([
    null,
    `${err} Could not find path:`,
    chalk.yellow(path),
    null,
    `Please try using ${copyPath} to copy the path from Finder, then ${paste} to paste it here.`,
  ]);

const getUnknownErrorCheckingPath = (path: string) =>
  wrap([
    null,
    `${err} Unknown error checking path:`,
    chalk.yellow(path),
  ]);

const getInvalidBepInExPackError = () =>
  wrap(
    `${EOL}${err} ${run_bepinex_sh} script does not appear to be located within a valid BepInEx pack.`,
  );

const getNotAFolderError = (path: string) =>
  wrap([
    null,
    `${err} Path is not a folder:`,
    chalk.yellow(path),
  ]);

const providePathInstructions = list([
  "Drag it into this window, or",
  `Select it and press ${copyPath} to copy the path to the script file, then press ${paste} to paste it here.`,
], false);

const bepinexPath = dirname(
  await prompt(
    wrap([
      null,
      `In Finder, locate the ${run_bepinex_sh} script file within your downloaded BepInEx pack, then either:`,
      null,
      providePathInstructions,
      null,
      `Path to ${run_bepinex_sh}:`,
    ]),
    async (value) => {
      const input = unquote(value);
      const path = await getFixedPath(input);

      if (!path) {
        error(getInvalidPathError(input));
        return false;
      }

      try {
        if (!(await stat(path)).isFile()) {
          error(
            wrap([
              null,
              `${err} Path is not a file:`,
              chalk.yellow(path),
              null,
              `Please make sure you are selecting the ${run_bepinex_sh} script and try again.`,
            ]),
          );
          return false;
        }
      } catch {
        error(getUnknownErrorCheckingPath(path));
        return false;
      }

      const filename = basename(path);
      if (filename.toLowerCase() !== "run_bepinex.sh") {
        error(
          wrap([
            null,
            `${err} Unexpected filename:`,
            chalk.yellow(filename),
            null,
            `If you are absolutely sure this is a valid ${run_bepinex_sh} script, rename it to ${run_bepinex_sh} and try again.`,
          ]),
        );
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

log(
  wrap([
    null,
    "macOS BepInEx pack successfully detected at:",
    chalk.green.bold(bepinexPath),
    null,
    "Next, we need to know the location of the Unity game.",
  ]),
);

const pleaseSelectAUnityGameAndTryAgain =
  "Please make sure you are selecting a Unity game app and try again.";

const gameAppPath = await prompt(
  wrap([
    null,
    `Open a Finder window at the game's location, (e.g. by clicking ${
      code("Manage -> Browse local files")
    } in Steam), find the app (e.g. ${
      code("Subnautica.app")
    }) and do the same thing as last time - either:`,
    null,
    providePathInstructions,
    null,
    "Path to Unity game app:",
  ]),
  async (value) => {
    const input = unquote(value);
    const path = await getFixedPath(input);

    if (!path) {
      error(getInvalidPathError(input));
      return false;
    }

    if (extname(path).toLowerCase() !== ".app") {
      error(
        wrap([
          null,
          `${err} Invalid app extension:`,
          chalk.yellow(basename(path)),
          null,
          pleaseSelectAUnityGameAndTryAgain,
        ]),
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

    const plist = join(path, "Contents", "Info.plist");
    if (await access(plist).catch((_) => true).then((_) => false)) {
      error(
        wrap([
          null,
          `${err} Could not find app plist for app:`,
          chalk.yellow(path),
          null,
          pleaseSelectAUnityGameAndTryAgain,
        ]),
      );
      return false;
    }

    if (!await hasUnityAppIndicators(plist)) {
      error(
        wrap([
          null,
          `${err} App does not appear to be a Unity game:`,
          chalk.yellow(path),
          null,
          `BepInEx only works for Unity games. ${pleaseSelectAUnityGameAndTryAgain}`,
        ]),
      );
      return false;
    }

    return path;
  },
);
const gamePath = dirname(gameAppPath);
const steamApps = await Array.fromAsync(getAppsByPath(gamePath));

log(
  wrap([
    null,
    "Unity app successfully detected at:",
    chalk.green.bold(gamePath),
    null,
  ]),
);

const installBepInEx = async () => {
  const i = bepinexPath.split(sep).length;
  const glob = new Glob("**/*");
  for await (
    const path of glob.scan({
      absolute: true,
      dot: true,
      onlyFiles: true,
      cwd: bepinexPath,
    })
  ) {
    if (basename(path) === ".DS_Store") continue;

    const destination = join(gamePath, path.split(sep).slice(i).join(sep));
    await ensureDir(dirname(destination));
    await copyFile(path, destination);

    if (basename(path) === "run_bepinex.sh" && dirname(path) === bepinexPath) {
      const bepinexScriptContents = await readFileSDGsd(destination, "utf8");
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
        await writeFile(destination, output, "utf8");
      }

      await chmod(destination, 0o764);
    }
  }
};

const plist = await readFile(join(gameAppPath, "Contents", "Info.plist"));
const operations: Promise<unknown>[] = [];
const shortcutPath = join(
  homedir(),
  "Applications",
  `${parse(gameAppPath).name} (${
    steamApps.length === 0 ? "BepInEx" : "Vanilla"
  }).app`,
);

if (steamApps.length === 1) {
  /**
   * - prompt user to let them know that we will configure steam to launch the
   *   game, and if steam is open we will quit it, confirm y/N, N = quit
   *
   * - also prompt to ask if user wants us to set up a shortcut to launch the
   *   game without mods, let them know this is experimental and will require
   *   closing steam, confirm y/N
   *
   * - terminate steam
   *
   * - get current launch options, if not empty confirm overwrite
   *
   * - set new launch options
   *
   * - optionally set up the shortcut to launch unmodded, to do so we make a
   *   .app in the game folder that runs a bash script which simply executes
   *   the original .app, copy it to ~/Applications
   */
  const app = steamApps[0];
  const [userId, user] = await getMostRecentUser();
  const username = code(user.PersonaName ?? user.AccountName);
  const game = code(app.name);

  log(
    wrap([
      [
        game,
        "appears to be installed with Steam. gib will need to configure Steam",
        "to launch it modded with BepInEx, which will overwrite any launch",
        "options you currently have set for the game, and will require Steam",
        "to be closed.",
      ].join(" "),
      null,
      [
        "Additionally, gib can optionally add a Steam shortcut to launch the",
        "game vanilla (without mods). This functionality is experimental and",
        "may not work for all Steam games.",
      ].join(" "),
      null,
    ]),
  );

  const shouldAddVanillaShortcut = confirmShim(
    wrap(
      `Add experimental Steam shortcut to launch ${game} without mods?`,
    ),
  );

  log(
    wrap(
      chalk.bold(`${EOL}gib will now perform the following operations:${EOL}`),
    ),
  );
  log(
    list(
      [
        "install and configure BepInEx for the selected Unity app",
        "quit Steam if it is open",
        [
          `configure Steam for user ${username} to launch ${game} modded`,
          "with BepInEx",
        ].join(" "),
        shouldAddVanillaShortcut &&
        [
          `add a Steam shortcut for user ${username} to launch ${game}`,
          "vanilla",
        ].join(" "),
      ].filter(Boolean),
      false,
    ),
  );

  log(wrap([
    null,
    chalk.bold.yellowBright(
      "This will potentially overwrite files in the process.",
    ),
    null,
    "You may be required to grant permission to the Terminal.",
    null,
  ]));

  if (!confirmShim(wrap(chalk.yellowBright("Proceed?")))) {
    throw wrap("User cancelled installation");
  }

  log();

  operations.push(
    installBepInEx(),
    isOpen()
      .then(async (isOpen) => {
        if (isOpen && !await quit()) {
          throw wrap([
            "Failed to terminate Steam",
            chalk.reset("Please ensure Steam is fully closed and try again."),
          ]);
        }
        return await Promise.all([
          setLaunchOptions(
            app,
            quote([resolve(gamePath, "run_bepinex.sh"), "%command%"]),
            userId,
          ).then((success) => {
            if (!success) throw wrap("Failed to set launch options");
          }),
          shouldAddVanillaShortcut && getShortcuts(userId)
            .then((shortcuts) =>
              shortcuts && setShortcuts(
                addShortcut({
                  AppName: `${app.name} (Vanilla)`,
                  Exe: quote([shortcutPath]),
                  icon: join(
                    shortcutPath,
                    "Contents",
                    "Resources",
                    "PlayerIcon.png",
                  ),
                } as Shortcut, shortcuts),
                userId,
              )
            )
            .then((success) => {
              if (!success) throw wrap("Failed to add shortcut");
            }),
        ].filter(Boolean));
      }),
    shouldAddVanillaShortcut
      ? Promise.all([
        ensureDir(join(
          shortcutPath,
          "Contents",
          "MacOS",
        ))
          .then(() =>
            writeFile(
              join(
                shortcutPath,
                "Contents",
                "MacOS",
                "run.sh",
              ),
              [
                "#!/bin/bash",
                "# autogenerated file - do not edit",
                quote(["open", gameAppPath]),
              ].join(EOL),
              { encoding: "utf8", mode: 0o764 },
            )
          ),
        ensureDir(join(shortcutPath, "Contents", "Resources"))
          .then(() => {
            const { CFBundleIconFile, CFBundleName } = plist;
            if (CFBundleIconFile) {
              return Promise.all([
                exec(quote([
                  "sips",
                  "-s",
                  "format",
                  "png",
                  join(gameAppPath, "Contents", "Resources", CFBundleIconFile),
                  "--out",
                  join(shortcutPath, "Contents", "Resources", "PlayerIcon.png"),
                ])),
                copyFile(
                  join(gameAppPath, "Contents", "Resources", CFBundleIconFile),
                  join(
                    shortcutPath,
                    "Contents",
                    "Resources",
                    "PlayerIcon.icns",
                  ),
                ),
                writeFile(
                  join(shortcutPath, "Contents", "Info.plist"),
                  buildPlist(
                    {
                      CFBundleIconFile,
                      CFBundleName: `${CFBundleName ?? app.name} (Vanilla)`,
                      CFBundleInfoDictionaryVersion: "1.0",
                      CFBundlePackageType: "APPL",
                      CFBundleVersion: "1.0",
                      CFBundleExecutable: "run.sh",
                    } satisfies Plist,
                  ),
                  "utf8",
                ),
              ].filter(Boolean));
            }
          }),
      ])
      : Promise.resolve(),
  );
} else if (steamApps.length > 1) {
  /**
   * - for now, regrettably tell user we can't handle this and advise them to
   *   install manually
   *
   * - in future, we can try to narrow it down by parsing steamcmd to figure
   *   out which executable is for which app etc., and later UI stuff
   */
  throw wrap("Multiple Steam apps detected in the same path");
} else {
  /**
   * - make a .app in the game folder that runs a bash script which simply
   *   executes the run_bepinex.sh with the path to the original .app as arg,
   *   copy it to ~/Applications, maybe offer to copy it to desktop?
   *
   * - if Steam installed, prompt user to ask if they want us to make a Steam
   *   shortcut to launch game modded, let them know this will require closing
   *   steam, let them know this is experimental, confirm y/N, if y:
   *
   *   - terminate steam
   *
   *   - get current shortcuts, add new shortcut
   */
  const { CFBundleName, CFBundleIconFile } = plist;
  const gameName = CFBundleName ?? basename(gameAppPath);
  const game = code(gameName);

  const steamInstalled = await isInstalled();
  const [userId, user] = steamInstalled
    ? await getMostRecentUser()
    : [undefined, undefined];
  const username = user && code(user.PersonaName ?? user.AccountName);

  const shouldAddModdedShortcut = await isInstalled() && confirmShim(wrap([
    [
      game,
      "appears to be a non-Steam game. gib can optionally add a Steam",
      "shortcut to launch the game modded with BepInEx. This functionality is",
      "experimental and will require Steam to be closed.",
    ].join(" "),
    null,
    `Add experimental Steam shortcut to launch ${game} with BepInEx?`,
  ]));

  log(
    wrap(
      chalk.bold(`${EOL}gib will now perform the following operations:${EOL}`),
    ),
  );
  log(
    list(
      [
        "install and configure BepInEx for the selected Unity app",
        shouldAddModdedShortcut &&
        "quit Steam if it is open",
        shouldAddModdedShortcut &&
        [
          `add a Steam shortcut for user ${username} to launch ${game}`,
          "with BepInEx",
        ].join(" "),
      ].filter(Boolean),
      false,
    ),
  );

  log(wrap([
    null,
    chalk.bold.yellowBright(
      "This will potentially overwrite files in the process.",
    ),
    null,
    "You may be required to grant permission to the Terminal.",
    null,
  ]));

  if (!confirmShim(wrap(chalk.yellowBright("Proceed?")))) {
    throw wrap("User cancelled installation");
  }

  log();

  const shortcutPath = join(
    homedir(),
    "Applications",
    `${parse(gameAppPath).name} (BepInEx).app`,
  );

  operations.push(
    installBepInEx(),
    shouldAddModdedShortcut
      ? isOpen()
        .then(async (isOpen) => {
          if (isOpen && !await quit()) {
            throw wrap([
              "Failed to terminate Steam",
              chalk.reset("Please ensure Steam is fully closed and try again."),
            ]);
          }
          const shortcuts = await getShortcuts(userId);
          return shortcuts && await setShortcuts(
            addShortcut(
              {
                AppName: `${gameName} (BepInEx)`,
                Exe: quote([shortcutPath]),
                icon: join(
                  shortcutPath,
                  "Contents",
                  "Resources",
                  "PlayerIcon.png",
                ),
              } satisfies Shortcut,
              shortcuts,
            ),
            userId,
          );
        })
        .then((success) => {
          if (!success) throw wrap("Failed to add shortcut");
        })
      : Promise.resolve(),
    Promise.all([
      ensureDir(join(
        shortcutPath,
        "Contents",
        "MacOS",
      ))
        .then(() =>
          writeFile(
            join(
              shortcutPath,
              "Contents",
              "MacOS",
              "run.sh",
            ),
            [
              "#!/bin/bash",
              "# autogenerated file - do not edit",
              quote([join(gamePath, "run_bepinex.sh"), gameAppPath]),
            ].join(EOL),
            { encoding: "utf8", mode: 0o764 },
          )
        ),
      ensureDir(join(shortcutPath, "Contents", "Resources"))
        .then(async () => {
          if (CFBundleIconFile) {
            await ensureDir(join(shortcutPath, "Contents", "Resources"));
            await Promise.all([
              shouldAddModdedShortcut &&
              exec(quote([
                "sips",
                "-s",
                "format",
                "png",
                join(gameAppPath, "Contents", "Resources", CFBundleIconFile),
                "--out",
                join(shortcutPath, "Contents", "Resources", "PlayerIcon.png"),
              ])),
              copyFile(
                join(gameAppPath, "Contents", "Resources", CFBundleIconFile),
                join(
                  shortcutPath,
                  "Contents",
                  "Resources",
                  "PlayerIcon.icns",
                ),
              ),
              writeFile(
                join(shortcutPath, "Contents", "Info.plist"),
                buildPlist(
                  {
                    CFBundleIconFile,
                    CFBundleName: `${gameName} (BepInEx)`,
                    CFBundleInfoDictionaryVersion: "1.0",
                    CFBundlePackageType: "APPL",
                    CFBundleVersion: "1.0",
                    CFBundleExecutable: "run.sh",
                  } satisfies Plist,
                ),
                "utf8",
              ),
            ].filter(Boolean));
          }
        }),
    ]),
  );
}

await Promise.all(operations);

log(wrap([
  "Finally, let's test that everything is working.",
  null,
  [
    "To perform the test, gib will automatically launch the game, wait up to",
    "30 seconds for signs of BepInEx activity, and then force quit the game.",
  ].join(" "),
  null,
  "Return to this Terminal window once the game has closed.",
]));
pressHeartToContinue("when you're ready to run the test");

const steamApp = steamApps[0];

if (steamApp) {
  launch(steamApp);
} else {
  open(shortcutPath);
}

var { detectedGame, detectedBepInEx } = await new Promise<
  { detectedGame: boolean; detectedBepInEx: boolean }
>(
  (resolve) => {
    let pids: number[] = [];
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
      if (!detectedBepInEx) pids.map((pid) => kill(pid, "SIGKILL"));
      resolve({ detectedGame, detectedBepInEx });
    };
    let timeout = setTimeout(finish, 30_000);

    const interval = setInterval(async () => {
      const apps = (await findProcess(
        "name",
        plist.CFBundleExecutable ?? basename(gameAppPath),
      )).filter(
        (process) => {
          if (
            !("bin" in process) || typeof process.bin !== "string"
          ) return false;
          const { bin } = process;
          const relativePath = relative(gamePath, bin);
          return relativePath && !relativePath.startsWith("..") &&
            !isAbsolute(relativePath);
        },
      );

      if (!detectedGame && apps.length) {
        clearTimeout(timeout);
        detectedGame = true;
        timeout = setTimeout(finish, 30_000);
        log(`${code(basename(gameAppPath))}`, "running...");
        pids = apps.map(({ pid }) => pid);
      } else if (detectedGame && !apps.length) {
        log(code(basename(gameAppPath)), "closed.");
        await finish();
      }
    }, 200);

    const handleChange = async () => {
      detectedBepInEx = true;
      pids.map((pid) => kill(pid, "SIGKILL"));
      await watcher.removeAllListeners().close();
    };

    watcher
      .on("add", handleChange)
      .on("change", handleChange);
  },
);

log();

if (!detectedGame && !detectedBepInEx) {
  throw wrap(
    `Timed out waiting for the game to launch. Test cancelled.${EOL}` +
      chalk.reset(
        "Unable to verify whether BepInEx is correctly installed. We " +
          "recommend running gib again, making sure to run the right game.",
      ),
  );
} else if (!detectedBepInEx) {
  throw wrap(
    `Failed to detect BepInEx. Did you forget to set Steam launch options?${EOL}` +
      chalk.reset(
        "We recommend running gib again, making sure to pay attention to the " +
          "section for setting the launch options for the game in Steam.",
      ),
  );
} else {
  await open("https://github.com/toebeann/gib/?sponsor=1", {
    background: true,
  });

  log(
    wrap([
      chalk.green.bold("Successfully detected BepInEx running!"),
      null,
      "Congratulations, you're now ready to go wild installing mods!",
      null,
      ...steamApp
        ? [
          "To launch the game modded, simply launch it from Steam as usual.",
          ...await access(shortcutPath).then((_) => true).catch((_) => false)
            ? [
              null,
              [
                "We also added a shortcut to Steam to launch the vanilla",
                `game, you can find it in your Steam library named ${
                  code(`${steamApp.name} (Vanilla)`)
                }`,
              ].join(" "),
              chalk.italic(
                "Please be aware this shortcut may not work for all Steam games.",
              ),
            ]
            : [],
        ]
        : [
          "To launch the game modded, launch the app found at:",
          chalk.green(shortcutPath),
          null,
          "To launch the game without mods, simply launch it as usual.",
        ],
      null,
      "If you found gib helpful, please consider donating:",
    ]),
  );
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
