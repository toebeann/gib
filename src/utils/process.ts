import findProcess from "find-process";

export const find = "default" in findProcess
  ? findProcess.default as typeof findProcess
  : findProcess;
