import { stderr, stdout, write } from "bun";
import { EOL } from "node:os";

export const print = (str = "") => write(stdout, str);
export const printline = (str = "") => write(stdout, str + EOL);

export const error = (str = "") => write(stderr, str);
export const errorline = (str = "") => write(stderr, str + EOL);
