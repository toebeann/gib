import { z } from "zod";
import { toCamelCaseKeys } from "../../utils/zod.ts";

const manifestConfigSchema = toCamelCaseKeys(
  z.object({
    /** @type {string | undefined} */
    language: z.unknown().optional(),
    /** @type {string | undefined} */
    betaKey: z.unknown().optional(),
  }).passthrough(),
);

/** Zod schema for working with Steam app manifest files. */
export const appManifestSchema = toCamelCaseKeys(
  z.object({
    appState: toCamelCaseKeys(z.object({
      appid: z.number(),
      name: z.string(),
      installdir: z.string(),
      stateFlags: z.number(),
      universe: z.number(),
      /** @type {number | undefined} */
      lastUpdated: z.unknown().optional(),
      /** @type {number | undefined} */
      sizeOnDisk: z.unknown().optional(),
      /** @type {number | undefined} */
      stagingSize: z.unknown().optional(),
      /** @type {number | undefined} */
      buildid: z.unknown().optional(),
      /** @type {number | undefined} */
      lastOwner: z.unknown().optional(),
      /** @type {number | undefined} */
      updateResult: z.unknown().optional(),
      /** @type {number | undefined} */
      bytesToDownload: z.unknown().optional(),
      /** @type {number | undefined} */
      bytesDownloaded: z.unknown().optional(),
      /** @type {number | undefined} */
      bytesToStage: z.unknown().optional(),
      /** @type {number | undefined} */
      bytesStaged: z.unknown().optional(),
      /** @type {number | undefined} */
      targetBuildId: z.unknown().optional(),
      /** @type {number | undefined} */
      autoUpdateBehavior: z.unknown().optional(),
      /** @type {number | undefined} */
      allowOtherDownloadsWhileRunning: z.unknown().optional(),
      /** @type {number | undefined} */
      scheduledAutoUpdate: z.unknown().optional(),
      /** @type {Record<string, string | number> | undefined} */
      sharedDepots: z.unknown().optional(),
      installedDepots: z.record(
        toCamelCaseKeys(
          z.object({
            /** @type {number | undefined} */
            manifest: z.unknown().optional(),
            /** @type {number | undefined} */
            size: z.unknown().optional(),
          }).passthrough(),
        ),
      ).or(z.unknown()).optional(),
      stagedDepots: z.record(
        toCamelCaseKeys(
          z.object({
            /** @type {number | undefined} */
            manifest: z.unknown().optional(),
            /** @type {number | undefined} */
            size: z.unknown().optional(),
            /** @type {number | undefined} */
            dlcappid: z.unknown().optional(),
          }).passthrough(),
        ),
      ).or(z.unknown()).optional(),
      dlcDownloads: z.record(
        toCamelCaseKeys(
          z.object({
            /** @type {number | undefined} */
            bytesDownloaded: z.unknown().optional(),
            /** @type {number | undefined} */
            bytesToDownload: z.unknown().optional(),
          }).passthrough(),
        ),
      ).or(z.unknown()).optional(),
      userConfig: manifestConfigSchema.optional(),
      mountedConfig: manifestConfigSchema.optional(),
    })),
  })
    .passthrough(),
);

/** A parsed Steam app manifest. */
export type AppManifest = z.infer<typeof appManifestSchema>;
