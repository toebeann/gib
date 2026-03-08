import { $ } from "bun";

export const quote = (args: string[]) => args.map($.escape).join(" ");
