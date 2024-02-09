import _ from "lodash";
import { z } from "zod";

export const toCamelCaseKeys =
  z.record(z.unknown()).transform((obj) =>
    _.mapKeys(obj, (__, key) => _.camelCase(key))
  ).pipe;
