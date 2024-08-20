import camelCase from "lodash.camelcase";
import mapKeys from "lodash.mapkeys";
import { z } from "zod";

export const numericBooleanSchema = z.union([z.literal(0), z.literal(1)]);

export const toCamelCaseKeys =
  z.record(z.unknown()).transform((obj) =>
    mapKeys(obj, (__, key) => camelCase(key))
  ).pipe;
