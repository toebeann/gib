import { writeSync } from "node:fs";
import { stdout } from "node:process";
import readlineSync from "readline-sync";

function shim(message: unknown = "Alert") {
  writeSync(stdout.fd, new TextEncoder().encode(`${message} [Enter] `));
  readlineSync.question();
}

globalThis.alert ??= shim;
