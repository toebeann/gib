import { printline } from "./print";

export const alert = globalThis.alert;

export const confirm = (message: string, yes = false) => {
  const defaultValue = "Y/n";
  return Boolean(
    yes
      ? printline(`${message} [${defaultValue}] yes`)
      : (
          globalThis.prompt(message, defaultValue) as string
        )[0]?.toLowerCase() !== "n",
  );
};

export const prompt = (message = "Prompt", defaultValue?: string) =>
  typeof defaultValue === "string"
    ? globalThis.prompt(message, defaultValue)
    : globalThis.prompt(message);
