import { question } from "readline-sync";

import { print } from "./print";

export const alert = (message: string) => {
  print(`${message} [Enter] `);
  question();
};

export const confirm = (message: string) => {
  print(`${message} [Y/n] `);
  return question()[0]?.toLowerCase() !== "n";
};

export const prompt = (message = "Prompt", defaultValue?: string) => {
  print(`${message}${defaultValue ? ` [${defaultValue}]` : ""} `);
  const result = question();
  return result.length > 0
    ? result
    : defaultValue !== null && defaultValue !== void 0
    ? defaultValue
    : null;
};
