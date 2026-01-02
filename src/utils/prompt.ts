import { question } from "readline-sync";

export const alert = async (message: string) => {
    question(`${message} [Enter] `);
};

export const confirm = (message: string) =>
    question(`${message} [y/N] `)[0]?.toLowerCase() === "y";

export const prompt = (message = "Prompt", defaultValue?: string) => {
    const result = question(
        `${message}${defaultValue ? ` [${defaultValue}]` : ""} `,
    );

    return result.length > 0
        ? result
        : defaultValue !== null && defaultValue !== void 0
        ? defaultValue
        : null;
};
