import { writeSync } from "node:fs";
import { stdout } from "node:process";
import readlineSync from "readline-sync";

function shim(message = "Prompt", defaultValue?: string) {
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

globalThis.prompt ??= shim;
