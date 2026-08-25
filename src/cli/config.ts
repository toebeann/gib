import { isStandaloneExecutable } from "bun";
import { parseArgs } from "node:util";

export const config = () => {
  const {
    values: {
      help: wantsHelp,
      version: wantsVersion,
      status: wantsUpdateExitStatus,
      update: wantsAutoUpdate,
      "path-check": wantsCheckPath,
      yes,
      launch,
    },
    positionals,
  } = parseArgs({
    allowNegative: true,
    allowPositionals: true,
    options: {
      help: { type: "boolean", short: "h", default: false },
      version: { type: "boolean", short: "v", default: false },
      status: { type: "boolean", short: "s", default: false },
      update: { type: "boolean", default: true },
      yes: { type: "boolean", short: "y", default: false },
      launch: { type: "string" },
      ...(isStandaloneExecutable
        ? { "path-check": { type: "boolean", default: true } }
        : {}),
    },
  });

  return {
    launch,
    positionals,
    yes,
    wantsHelp,
    wantsVersion,
    wantsUpdateExitStatus,
    wantsAutoUpdate,
    wantsCheckPath: typeof wantsCheckPath === "boolean" && wantsCheckPath,
  };
};
