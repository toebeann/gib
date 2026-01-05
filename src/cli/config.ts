import { basename } from "node:path";
import { execPath } from "node:process";
import { parseArgs } from "node:util";

export const config = () => {
    const command = basename(execPath);
    const {
        values: {
            help: wantsHelp,
            version: wantsVersion,
            status: wantsUpdateExitStatus,
            update: wantsAutoUpdate,
            "path-check": wantsCheckPath,
        },
    } = parseArgs({
        allowNegative: true,
        options: {
            help: { type: "boolean", short: "h", default: false },
            version: { type: "boolean", short: "v", default: false },
            status: { type: "boolean", short: "s", default: false },
            update: { type: "boolean", default: true },
            ...(command === "gib"
                ? { "path-check": { type: "boolean", default: true } }
                : {}),
        },
    });

    return {
        wantsHelp,
        wantsVersion,
        wantsUpdateExitStatus,
        wantsAutoUpdate,
        wantsCheckPath: typeof wantsCheckPath === "boolean" && wantsCheckPath,
    };
};
