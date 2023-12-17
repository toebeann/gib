import {
  boxen,
  center,
  cliWidth,
  figlet,
  getColorEnabled,
  gradientString,
  gray,
  reset,
  wrapAnsi,
} from "../deps.ts";
import { version } from "../version.ts";

const width = () => cliWidth({ defaultWidth: 80 });
const wrap = (
  str: string,
  columns = width(),
  options?: Parameters<typeof wrapAnsi>[2],
) => wrapAnsi(str, columns, options);

export const createLogo = async () => {
  const outputLines: string[] = [];

  const { stdout } = await (new Deno.Command("deno", { args: ["--version"] }))
    .output();
  outputLines.push(
    gray(`gib ${version}`),
    ...gray(wrap(new TextDecoder().decode(stdout))).split("\n"),
  );

  const logo = new Promise<string>((resolve, reject) =>
    figlet(
      "gib",
      "Colossal",
      (err, data) => (err && reject(err)) || resolve(data!),
    )
  );

  const gradient = getColorEnabled()
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
        gradient.multiline(boxedLines.join("\n")).split("\n").map((line) =>
          `${" ".repeat(padding)}${line}`
        ).join("\n"),
        width(),
        { trim: false },
      ).split("\n"),
    );
  } else {
    outputLines.push(
      ...gradient.multiline(center(wrap(title), width())).split("\n"),
    );
  }

  return `${outputLines.join("\n")}${reset("")}`;
};

export const renderLogo = () => createLogo().then(console.log);
