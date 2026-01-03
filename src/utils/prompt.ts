import { stdout, write } from "bun";

import { question } from "readline-sync";

export const alert = async (message: string) => {
    await write(stdout, `${message} [Enter] `);
    question();
};

export const confirm = async (message: string) => {
    await write(stdout, `${message} [Y/n] `);
    return question()[0]?.toLowerCase() !== "n";
};

export const prompt = async (message = "Prompt", defaultValue?: string) => {
    await write(
        stdout,
        `${message}${defaultValue ? ` [${defaultValue}]` : ""} `,
    );

    const result = question();
    return result.length > 0
        ? result
        : defaultValue !== null && defaultValue !== void 0
        ? defaultValue
        : null;
};
