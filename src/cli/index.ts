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

import { $, file, Glob, write } from "bun";

import { access, chmod, mkdir, stat } from "node:fs/promises";
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
import { kill, platform } from "node:process";

import chalk from "chalk";
import { watch } from "chokidar";
import cliWidth from "cli-width";
import findProcess from "find-process";
import JSZip from "jszip";
import open from "open";
import { pathEqual } from "path-equal";
import { build as buildPlist } from "plist";
import { quote } from "shell-quote";
import terminalLink from "terminal-link";
import unquote from "unquote";
import wrapAnsi from "wrap-ansi";
import { z } from "zod";

import { exists } from "../fs/exists.ts";
import { getAppById, getAppsByPath, launch } from "../launchers/steam/app.ts";
import { isInstalled } from "../launchers/steam/launcher.ts";
import { setLaunchOptions } from "../launchers/steam/launchOption.ts";
import { getMostRecentUser } from "../launchers/steam/loginusers.ts";
import { isOpen, quit } from "../launchers/steam/process.ts";
import {
  addShortcut,
  getShortcuts,
  setShortcuts,
  type Shortcut,
} from "../launchers/steam/shortcut.ts";
import { getFixedPath } from "../utils/getFixedPath.ts";
import { parsePlistFromFile, type Plist } from "../utils/plist.ts";
import { hasUnityAppIndicators, search } from "../utils/unity.ts";
import { renderLogo } from "./renderLogo.ts";

export const run = async () => {
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
  ) =>
    wrapAnsi(typeof str === "string" ? str : str.join(EOL), columns, options);

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
    alert(wrap(chalk.yellowBright(`Press enter ${message}`)));
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

  const promptUntil = async (
    message: string,
    validator:
      | ((value: string) => string | false)
      | ((value: string) => Promise<string | false>),
    defaultValue?: string,
  ) => {
    let value: string | undefined;

    do {
      value = defaultValue
        ? prompt(message, defaultValue)?.trim()
        : prompt(message)?.trim();

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
    `Select it and press ${copyPath} to copy its path, then press ${paste} to paste the path here.`,
  ], false);

  const bepinexPath = dirname(
    await promptUntil(
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

        const libdoorstop = join(path, "..", "libdoorstop.dylib");
        const oldDoorstop = join(path, "..", "doorstop_libs");

        if (
          !await access(libdoorstop).then(() =>
            stat(libdoorstop).then((stats) => stats.isFile())
          ).catch(() => false) &&
          !await access(oldDoorstop).then(() =>
            stat(oldDoorstop).then((stats) => stats.isDirectory())
          ).catch(() => false)
        ) {
          error(getInvalidBepInExPackError());
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

  const gameAppPath = await promptUntil(
    wrap([
      null,
      `Open a Finder window at the game's location, (e.g. by clicking ${
        code("Manage -> Browse local files")
      } in Steam), find the game's app (e.g. ${code("Subnautica.app")}) or ${
        code("Contents")
      } folder and do the same thing as last time - either:`,
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

      if (
        extname(path).toLowerCase() !== ".app" &&
        basename(path) !== "Contents"
      ) {
        error(
          wrap([
            null,
            `${err} Invalid app path:`,
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

      const plist = basename(path) === "Contents"
        ? join(path, "Info.plist")
        : join(path, "Contents", "Info.plist");

      if (!await exists(plist)) {
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

      const { CFBundleExecutable } = await parsePlistFromFile(plist);
      if (CFBundleExecutable && extname(CFBundleExecutable) === ".sh") {
        const text = await file(join(plist, "..", "MacOS", CFBundleExecutable))
          .text();

        const lines = text
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => !line.startsWith("#") && Boolean(line));

        if (lines.length === 1 && lines[0].startsWith("open steam://")) {
          const [command, ...args] = lines[0].split("open steam://")[1]?.split(
            "/",
          );
          if (
            ["launch", "run", "rungameid"].includes(command.toLowerCase()) &&
            !!+args[0]
          ) {
            const steamApp = await getAppById(args[0]);
            if (steamApp) {
              const unityApps = await Array.fromAsync(search(steamApp.path));
              if (unityApps.length === 1) {
                const [app] = unityApps;
                return app.bundle;
              }
            }
          }
        }
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

      return basename(path) === "Contents"
        ? extname(dirname(path)) === ".app"
          ? dirname(path)
          : join(plist, "..", "MacOS", CFBundleExecutable)
        : path;
    },
  );
  const gamePath = extname(gameAppPath) === ".app"
    ? dirname(gameAppPath)
    : join(gameAppPath, "..", "..", "..");

  log(
    wrap([
      null,
      "Unity app successfully detected at:",
      chalk.green.bold(gamePath),
      null,
    ]),
  );

  const configureBepInExScript = async (
    path: string,
    executablePath: string,
  ) => {
    const bepinexScriptContents = await file(path).text();
    let output = bepinexScriptContents;

    // fix CRLF line endings if needed
    output = output.replaceAll("\r\n", "\n");

    // configure run_bepinex.sh
    output = output.replace(
      '\nexecutable_name=""',
      `\nexecutable_name="${relative(dirname(path), executablePath)}"`,
    );

    // workaround for issue with BepInEx v5.4.23 run_bepinex.sh script not working
    // for some games unless ran from the game folder for some reason
    const basedirIndex = output.indexOf("BASEDIR=");
    if (basedirIndex !== -1 && !output.includes('cd "$BASEDIR"')) {
      const insertIndex = output.indexOf("\n", basedirIndex);
      output = `${
        output.slice(0, insertIndex)
      }\ncd "$BASEDIR" # GIB: workaround for some games only working if script is run from game dir${
        output.slice(insertIndex)
      }`;
    }

    // workaround for issue with doorstop 4 where specifying the direct path to
    // the executable only works for games correctly packaged in a .app folder
    output = output.replace(
      String
        .raw`if ! echo "$real_executable_name" | grep "^.*\.app/Contents/MacOS/.*";`,
      String
        .raw`if ! echo "$real_executable_name" | grep "^.*/Contents/MacOS/.*";`,
    );

    // workaround to ensure the game's Content folder is packaged in an .app folder
    if (!output.includes("mkdir -p")) {
      const lines = output.split("\n");
      const runExecutablePathIndex = lines.findLastIndex((line) =>
        line.includes("executable_path")
      );
      const codesignIndex = lines.findLastIndex(
        (line) => line.includes("codesign"),
        runExecutablePathIndex,
      );
      const emptyLineIndex = lines.lastIndexOf(
        "",
        codesignIndex !== -1 ? codesignIndex : runExecutablePathIndex,
      );
      output = lines.toSpliced(
        emptyLineIndex,
        0,
        "",
        "# gib: workaround to ensure game content is packaged in an .app folder",
        'app_path="${executable_path%/Contents/MacOS*}"',
        'if [[ $(basename "$app_path") != *.app ]]; then',
        '    real_executable_name=$(basename "$executable_path")',
        '    executable_path="${app_path}/${real_executable_name}.app/Contents/MacOS/${real_executable_name}"',
        '    target_path="${app_path}/${real_executable_name}.app/Contents"',
        '    mkdir -p "$target_path"',
        '    cp -ca "${app_path}/Contents/" "${target_path}/"',
        "fi",
      ).join("\n");
    }

    // workaround for issue with codesigned apps preventing doorstop injection
    if (!output.includes("codesign --remove-signature")) {
      const lines = output.split("\n");
      const runExecutablePathIndex = lines.findLastIndex((line) =>
        line.includes("executable_path")
      );
      const emptyLineIndex = lines.lastIndexOf("", runExecutablePathIndex);
      output = lines
        .toSpliced(
          emptyLineIndex,
          0,
          "",
          "# gib: workaround to ensure game is not codesigned so that doorstop can inject BepInEx",
          'app_path="${executable_path%/Contents/MacOS*}"',
          'if command -v codesign &>/dev/null && codesign -d "$app_path"; then',
          '    codesign --remove-signature "$app_path"',
          "fi",
        ).join("\n");
    }

    // write the changes, if any
    if (output !== bepinexScriptContents) {
      await write(path, output);
    }

    await chmod(path, 0o764);
  };

  const installBepInEx = async () => {
    const i = bepinexPath.split(sep).length;
    const glob = new Glob("**/*");
    for await (
      const origin of glob.scan({
        absolute: true,
        dot: true,
        onlyFiles: true,
        cwd: bepinexPath,
      })
    ) {
      if (basename(origin) === ".DS_Store") continue;

      const destination = join(gamePath, origin.split(sep).slice(i).join(sep));
      if (!pathEqual(origin, destination)) {
        await write(destination, file(origin));
      }

      if (
        basename(origin) === "run_bepinex.sh" &&
        dirname(origin) === bepinexPath
      ) {
        await configureBepInExScript(destination, gameAppPath);
      }
    }

    await $`xattr -rd com.apple.quarantine ${gamePath}`.nothrow().quiet();
  };

  const [steamApps, plist, switchSupported] = await Promise.all([
    Array.fromAsync(getAppsByPath(gamePath)),
    parsePlistFromFile(
      join(
        extname(gameAppPath) === ".app" ? gameAppPath : gamePath,
        "Contents",
        "Info.plist",
      ),
    ),
    (async () => {
      if (
        !await access(join(bepinexPath, "libdoorstop.dylib"))
          .then(() => true)
          .catch(() => false)
      ) return false;

      try {
        return (await file(join(bepinexPath, "run_bepinex.sh")).text())
          .includes("--doorstop_enabled)");
      } catch {
        return false;
      }
    })(),
  ]);
  const operations: Promise<unknown>[] = [];
  const shortcutPath = join(
    homedir(),
    "Applications",
    `${
      extname(gameAppPath) === ".app"
        ? parse(gameAppPath).name
        : plist.CFBundleName || parse(plist.CFBundleExecutable).name
    } (${steamApps.length === 0 ? "BepInEx" : "Vanilla"}).app`,
  );
  let shouldAddShortcut: boolean;

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
    const { name, id } = app;
    const game = code(name);
    const [userId, { PersonaName, AccountName }] = await getMostRecentUser();
    const username = code(PersonaName ?? AccountName);

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
          "game vanilla (without mods). This feature is experimental, and is",
          "only supported for BepInEx packs which support the",
          code("--doorstop_enabled"),
          "flag.",
        ].join(" "),
        null,
        [
          code("--doorstop_enabled"),
          "support",
          switchSupported
            ? chalk.green.bold("detected")
            : chalk.redBright.bold("not found"),
          "in your BepInEx pack.",
        ].join(" "),
        null,
        switchSupported
          ? [
            "gib will set this flag in the vanilla shortcut. Steam may prompt",
            "you about this flag whenever you launch the vanilla shortcut.",
          ].join(" ")
          : [
            "As your BepInEx pack does not support this feature, gib can",
            "attempt to add support by downloading the latest version of",
            "BepInEx and updating the provided pack. This will allow gib to set",
            "up the vanilla shortcut while retaining any game-specific",
            "customisations from the pack.",
          ].join(" "),
        null,
      ]),
    );

    shouldAddShortcut = confirm(
      wrap(
        switchSupported
          ? `Add experimental Steam shortcut to launch ${game} without mods?`
          : [
            `Add experimental Steam shortcut to launch ${game} without mods by`,
            "updating this pack to the latest BepInEx 5 release?",
          ].join(" "),
      ),
    );

    log();
    log(
      wrap(
        chalk.bold(`gib will now perform the following operations:${EOL}`),
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
          shouldAddShortcut && !switchSupported &&
          "download the latest BepInEx 5 release to update your BepInex pack",
          shouldAddShortcut &&
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

    if (!confirm(wrap(chalk.yellowBright("Proceed?")))) {
      throw wrap("User cancelled installation");
    }

    log();

    operations.push(
      (async () => {
        const installing = installBepInEx();
        if (shouldAddShortcut && !switchSupported) {
          let response: Promise<Response>;
          try {
            const releases = z.object({
              target_commitish: z.string(),
              prerelease: z.boolean(),
              assets: z.object({
                name: z.string(),
                browser_download_url: z.string(),
              }).array(),
            }).array()
              .parse(
                await (await fetch(
                  "https://api.github.com/repos/BepInEx/BepInEx/releases",
                )).json(),
              );
            const { assets } = releases
              .find(({ target_commitish, prerelease, assets }) =>
                !prerelease &&
                target_commitish === "v5-lts" &&
                assets.find(({ name }) =>
                  name.toLowerCase().includes("macos_x64") &&
                  name.toLowerCase().endsWith(".zip")
                )
              ) ?? {};
            const { browser_download_url } = assets?.find(({ name }) =>
              name.toLowerCase().includes("macos_x64") &&
              name.toLowerCase().endsWith(".zip")
            ) ?? {};
            if (!browser_download_url) {
              throw "Couldn't get latest BepInEx 5 release asset";
            }
            response = fetch(browser_download_url);
          } catch {
            response = fetch(
              "https://github.com/BepInEx/BepInEx/releases/download/v5.4.23.2/BepInEx_macos_x64_5.4.23.2.zip",
            );
          }

          const [archive] = await Promise.all([
            response
              .then((response) => response.arrayBuffer())
              .then(JSZip.loadAsync),
            installing,
          ]);

          const filenames = Object.keys(archive.files);
          if (!filenames.includes("run_bepinex.sh")) {
            throw "Downloded BepInEx pack appears invalid";
          }
          await Promise.all(filenames
            .map((filename) =>
              archive.file(filename)!
                .async("arraybuffer")
                .then((data) => write(resolve(gamePath, filename), data))
                .then(() =>
                  filename === "run_bepinex.sh" &&
                    configureBepInExScript(
                      resolve(gamePath, filename),
                      gameAppPath,
                    ) || undefined
                )
            ));
        } else {
          await installing;
        }
      })(),
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
              quote([
                "/usr/bin/arch",
                "-x86_64",
                "/bin/bash",
                resolve(gamePath, "run_bepinex.sh"),
                "%command%",
              ]),
              userId,
            ).then((success) => {
              if (!success) throw wrap("Failed to set launch options");
            }),
            shouldAddShortcut && getShortcuts(userId)
              .then((shortcuts) =>
                shortcuts && setShortcuts(
                  addShortcut({
                    AppName: `${name} (Vanilla)`,
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
      shouldAddShortcut
        ? Promise.all([
          mkdir(
            join(
              shortcutPath,
              "Contents",
              "MacOS",
            ),
            { recursive: true },
          )
            .then(() =>
              write(
                join(shortcutPath, "Contents", "MacOS", "run.sh"),
                [
                  "#!/bin/bash",
                  "# autogenerated file - do not edit",
                  quote([
                    "open",
                    `steam://run/${id}//--doorstop_enabled false`,
                  ]),
                ].join(EOL),
              )
                .then(() =>
                  chmod(
                    join(shortcutPath, "Contents", "MacOS", "run.sh"),
                    0o764,
                  )
                )
            ),
          mkdir(join(shortcutPath, "Contents", "Resources"), {
            recursive: true,
          })
            .then(() => {
              const { CFBundleIconFile, CFBundleName } = plist;
              if (CFBundleIconFile) {
                return Promise.all([
                  $`sips -s format png ${
                    join(
                      extname(gameAppPath) === ".app" ? gameAppPath : gamePath,
                      "Contents",
                      "Resources",
                      CFBundleIconFile,
                    )
                  } --out ${
                    join(
                      shortcutPath,
                      "Contents",
                      "Resources",
                      "PlayerIcon.png",
                    )
                  }`.quiet(),
                  write(
                    join(
                      shortcutPath,
                      "Contents",
                      "Resources",
                      "PlayerIcon.icns",
                    ),
                    file(
                      join(
                        extname(gameAppPath) === ".app"
                          ? gameAppPath
                          : gamePath,
                        "Contents",
                        "Resources",
                        CFBundleIconFile,
                      ),
                    ),
                  ),
                  write(
                    join(shortcutPath, "Contents", "Info.plist"),
                    buildPlist(
                      {
                        CFBundleIconFile,
                        CFBundleName: `${
                          typeof CFBundleName === "string" ? CFBundleName : name
                        } (Vanilla)`,
                        CFBundleInfoDictionaryVersion: "1.0",
                        CFBundlePackageType: "APPL",
                        CFBundleVersion: "1.0",
                        CFBundleExecutable: "run.sh",
                      } satisfies Plist,
                    ),
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
    const { CFBundleName, CFBundleIconFile, CFBundleExecutable } = plist;
    const gameName = typeof CFBundleName === "string"
      ? CFBundleName
      : extname(gameAppPath) === ".app"
      ? parse(gameAppPath).name
      : parse(CFBundleExecutable).name;
    const game = code(gameName);

    const steamInstalled = await isInstalled();
    const [userId, user] = steamInstalled
      ? await getMostRecentUser()
      : [undefined, undefined];
    const username = user &&
      code(
        typeof user.PersonaName === "string"
          ? user.PersonaName
          : user.AccountName,
      );

    shouldAddShortcut = await isInstalled() && confirm(wrap([
      [
        game,
        "appears to be a non-Steam game. gib can optionally add a Steam",
        "shortcut to launch the game modded with BepInEx. This feature is",
        "experimental and will require Steam to be closed.",
      ].join(" "),
      null,
      `Add experimental Steam shortcut to launch ${game} with BepInEx?`,
    ]));

    log(
      wrap(
        chalk.bold(
          `${EOL}gib will now perform the following operations:${EOL}`,
        ),
      ),
    );
    log(
      list(
        [
          "install and configure BepInEx for the selected Unity app",
          shouldAddShortcut && "quit Steam if it is open",
          shouldAddShortcut && [
            "add a Steam shortcut for user",
            username,
            "to launch",
            game,
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

    if (!confirm(wrap(chalk.yellowBright("Proceed?")))) {
      throw wrap("User cancelled installation");
    }

    log();

    const shortcutPath = join(
      homedir(),
      "Applications",
      `${
        extname(gameAppPath) === ".app"
          ? parse(gameAppPath).name
          : CFBundleName || parse(CFBundleExecutable).name
      } (BepInEx).app`,
    );

    operations.push(
      installBepInEx(),
      shouldAddShortcut
        ? isOpen()
          .then(async (isOpen) => {
            if (isOpen && !await quit()) {
              throw wrap([
                "Failed to terminate Steam",
                chalk.reset(
                  "Please ensure Steam is fully closed and try again.",
                ),
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
        mkdir(
          join(
            shortcutPath,
            "Contents",
            "MacOS",
          ),
          { recursive: true },
        )
          .then(() =>
            write(
              join(shortcutPath, "Contents", "MacOS", "run.sh"),
              [
                "#!/bin/bash",
                "# autogenerated file - do not edit",
                quote([
                  "/usr/bin/arch",
                  "-x86_64",
                  "/bin/bash",
                  join(gamePath, "run_bepinex.sh"),
                  gameAppPath,
                ]),
              ].join(EOL),
            )
              .then(() =>
                chmod(
                  join(shortcutPath, "Contents", "MacOS", "run.sh"),
                  0o764,
                )
              )
          ),
        mkdir(join(shortcutPath, "Contents", "Resources"), { recursive: true })
          .then(async () => {
            if (CFBundleIconFile) {
              await mkdir(join(shortcutPath, "Contents", "Resources"), {
                recursive: true,
              });
              await Promise.all([
                shouldAddShortcut &&
                $`sips -s format png ${
                  join(
                    extname(gameAppPath) === ".app" ? gameAppPath : gamePath,
                    "Contents",
                    "Resources",
                    CFBundleIconFile,
                  )
                } --out ${
                  join(shortcutPath, "Contents", "Resources", "PlayerIcon.png")
                }`.quiet(),
                write(
                  join(
                    shortcutPath,
                    "Contents",
                    "Resources",
                    "PlayerIcon.icns",
                  ),
                  file(
                    join(
                      extname(gameAppPath) === ".app" ? gameAppPath : gamePath,
                      "Contents",
                      "Resources",
                      CFBundleIconFile,
                    ),
                  ),
                ),
                write(
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
    await launch(steamApp);
    log(wrap([`Launching ${code(steamApp.name)} with Steam...`, null]));
  } else {
    await open(shortcutPath);
  }

  var { detectedGame, detectedBepInEx } = await new Promise<
    { detectedGame: boolean; detectedBepInEx: boolean }
  >(
    (resolve) => {
      const watcher = watch(join(gamePath, "BepInEx", "LogOutput.log"), {
        ignoreInitial: true,
        ignorePermissionErrors: true,
      });
      let detectedGame = false, detectedBepInEx = false;
      const getProcesses = () =>
        findProcess("name", plist.CFBundleExecutable ?? basename(gameAppPath))
          .then((processes) =>
            processes.filter(
              (process) => {
                if (
                  !("bin" in process) || typeof process.bin !== "string"
                ) return false;
                const { bin } = process;
                const relativePath = relative(gamePath, bin);
                return relativePath && !relativePath.startsWith("..") &&
                  !isAbsolute(relativePath);
              },
            )
          );

      const finish = async () => {
        await watcher.removeAllListeners().close();
        clearTimeout(timeout);
        clearInterval(interval);
        (await getProcesses()).map(({ pid }) => kill(pid, "SIGKILL"));
        resolve({ detectedGame, detectedBepInEx });
      };
      let timeout = setTimeout(finish, 30_000);

      const interval = setInterval(async () => {
        const processes = await getProcesses();

        if (!detectedGame && processes.length) {
          clearTimeout(timeout);
          detectedGame = true;
          timeout = setTimeout(finish, 30_000);
          log(`${code(basename(gameAppPath))}`, "running...");
        } else if (detectedGame && !processes.length) {
          log(code(basename(gameAppPath)), "closed.");
          await finish();
        }
      }, 200);

      const handleChange = async () => {
        detectedBepInEx = true;
        (await getProcesses()).map(({ pid }) => kill(pid, "SIGKILL"));
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
    throw wrap([
      "Failed to detect BepInEx",
      chalk.reset(
        [
          "It seems BepInEx failed to inject into the game. Unfortunately,",
          "some Unity games don't work with BepInEx on macOS for unknown",
          "reasons, and this appears to be one of them 😔",
        ].join(" "),
      ),
    ]);
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
            ...shouldAddShortcut
              ? [
                null,
                [
                  "We also added a Steam shortcut to launch the vanilla game.",
                  "You can find it in your Steam library named",
                  code(`${steamApp.name} (Vanilla)`),
                ].join(" "),
                chalk.italic([
                  "Please be aware this feature is experimental.",
                  "Steam may prompt you about the",
                  code("--doorstop_enabled"),
                  "flag whenever you launch the vanilla shortcut.",
                ].join(" ")),
              ]
              : switchSupported
              ? []
              : chalk.italic([
                "We recommend running gib again with an official release of the",
                "latest BepInEx 5, so that gib can add a Steam shortcut to",
                "launch the game vanilla.",
              ].join(" ")),
          ]
          : [
            "To launch the game modded, launch the app found at:",
            chalk.green(shortcutPath),
            null,
            ...shouldAddShortcut
              ? [
                [
                  "We also added a shortcut to Steam to launch the game with",
                  "BepInEx. You can find it in your Steam library named",
                  code(parse(shortcutPath).name),
                ].join(" "),
                null,
              ]
              : [],
            [
              "Please be aware that platform-specific features such as",
              "achievements or in-game overlays will be unavailable when",
              "running mods with non-Steam games.",
            ].join(" "),
            null,
            [
              "To launch the game vanilla, simply launch it as you normally",
              "would, e.g. via the Epic Games launcher, etc.",
            ].join(" "),
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
};

if (import.meta.main) await run();
