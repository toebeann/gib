import { writeSync } from "node:fs";
import { stdout } from "node:process";
import readlineSync from "readline-sync";

function shim(message: string = "Confirm") {
  writeSync(stdout.fd, new TextEncoder().encode(`${message} [y/N] `));
  const result = readlineSync.question();
  return ["y", "Y"].includes(result);
}

globalThis.confirm ??= shim;
