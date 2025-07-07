import { env } from "node:process";
import boxen from "boxen";
import center from "center-align";
import chalk from "chalk";
import cliWidth from "cli-width";
import figlet from "figlet";
import gradientString from "gradient-string";
import wrapAnsi from "wrap-ansi";
import { version } from "../../package.json" with { type: "json" };

const width = () => cliWidth({ defaultWidth: 80 });
const wrap = (
  str: string,
  columns = width(),
  options?: Parameters<typeof wrapAnsi>[2],
) => wrapAnsi(str, columns, options);

export const createLogo = async () => {
  // const { version } = packageMetadata;
  const outputLines: string[] = [];

  outputLines.push(
    chalk.gray(
      `gib v${version} ${
        typeof Bun !== "undefined"
          ? `bun v${Bun.version}`
          : `node ${process.version}`
      }`,
    ),
  );

  const logo = new Promise<string>((resolve, reject) =>
    figlet(
      "gib",
      "Colossal",
      (err, data) => (err && reject(err)) || resolve(data!),
    )
  );

  const gradient = env.NO_COLOR === undefined
    ? gradientString.retro
    : gradientString("white", "white");

  const title = "tobey's Guided Installer for BepInEx";

  const logoLines = (await logo).split("\n");

  if (width() >= title.length + 4) {
    const boxed = boxen(logoLines.join("\n"), {
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

    const boxedLines = boxed.split("\n");
    const padding = Math.floor(
      (Math.min(80, width()) / 2) - (boxedLines[0].length / 2),
    );

    outputLines.push(
      ...wrap(
        gradient.multiline(boxedLines.join("\n")).split("\n").map((
          line: string,
        ) => `${" ".repeat(padding)}${line}`).join("\n"),
        width(),
        { trim: false },
      ).split("\n"),
    );
  } else {
    outputLines.push(
      ...gradient.multiline(center(wrap(title), width())).split("\n"),
    );
  }

  return `${outputLines.join("\n")}${chalk.reset("")}`;
};

export const renderLogo = () => createLogo().then(console.log);
