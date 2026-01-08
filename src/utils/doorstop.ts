import { file } from "bun";

const doorstopEnabled = /export DOORSTOP_ENABLED?=/;
export const isDoorstopScript = async (filePath: string) => {
    const f = file(filePath);
    return f.type.toLowerCase() === "application/x-sh" &&
        doorstopEnabled.test(await f.text());
};

const bepInExCore = /BepInEx\/core\/BepInEx/i;
export const hasBepInExCore = async (filePath: string) =>
    bepInExCore.test(await file(filePath).text());

const dylib = /dylib/i;
const dyldInsertLibraries = /export DYLD_INSERT_LIBRARIES=/;
export const hasMacOsSupport = async (filePath: string) => {
    const text = await file(filePath).text();
    return dylib.test(text) && dyldInsertLibraries.test(text);
};
