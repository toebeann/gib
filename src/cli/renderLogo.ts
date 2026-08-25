import { wrapAnsi } from "bun";

import { EOL } from "node:os";
import { env, versions } from "node:process";

import boxen from "boxen";
import center from "center-align";
import chalk from "chalk";
import cliWidth from "cli-width";
import gradientString, { retro } from "gradient-string";

import { version } from "../../package.json" with { type: "json" };
import { logo } from "./ascii.ts" with { type: "macro" };
import { printline } from "./print.ts";

const width = () => cliWidth({ defaultWidth: 120 });
const wrap = (
  str: string,
  columns = width(),
  options?: Parameters<typeof wrapAnsi>[2],
) => wrapAnsi(str, columns, options);

const shortVersion = (version: string) =>
  version.substring(0, (/(\.0)+?/.exec(version) ?? { index: undefined }).index);

export const createLogo = async () => {
  const outputLines: string[] = [];

  const { bun, node } = versions;

  const metadata = `gib v${shortVersion(version)} bun v${shortVersion(bun)} node v${shortVersion(node)}`;

  const gradient =
    env.NO_COLOR === undefined ? retro : gradientString(["white", "white"]);

  const title = "tobey's Guided Installer for BepInEx";

  const logoLines = (await logo()).split(EOL);

  if (width() >= title.length + 4) {
    const boxed = boxen(logoLines.join(EOL), {
      padding: 1,
      textAlignment: "center",
      borderStyle: "bold",
      title,
      titleAlignment: "center",
      width: Math.min(
        width() - (width() >= title.length + 6 ? 2 : 0),
        2 * Math.floor(Math.min(width(), title.length + 10) / 2),
      ),
    });

    const boxedLines = boxed.split(EOL);
    const padding = Math.floor(width() / 2 - boxedLines[0].length / 2);

    outputLines.push(
      ...gradient
        .multiline(boxedLines.join(EOL))
        .split(EOL)
        .map((line) => `${" ".repeat(padding)}${line}`),
      chalk.gray(center(metadata, boxedLines[0].length + padding * 2)),
    );
  } else {
    const split = metadata.split(" ");
    const pairs = Array.from({ length: split.length / 2 }, (_, i) =>
      split.slice(i * 2, i * 2 + 2),
    );

    outputLines.push(
      ...gradient.multiline(center(wrap(title), width())).split(EOL),
      "",
      ...pairs.map((pair) => chalk.gray(center(pair.join(" "), width()))),
      "",
    );
  }

  return `${outputLines.join(EOL)}${chalk.reset("")}`;
};

export const renderLogo = async () => printline(await createLogo());
