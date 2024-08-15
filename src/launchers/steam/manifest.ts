import { z } from "zod";
import { toCamelCaseKeys } from "../../utils/zod.ts";

const manifestConfigSchema = toCamelCaseKeys(
  z.object({
    language: z.string().optional(),
    betaKey: z.string().optional(),
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
      lastUpdated: z.number().optional(),
      sizeOnDisk: z.number().optional(),
      stagingSize: z.number().optional(),
      buildid: z.number().optional(),
      lastOwner: z.number().optional(),
      updateResult: z.number().optional(),
      bytesToDownload: z.number().optional(),
      bytesDownloaded: z.number().optional(),
      bytesToStage: z.number().optional(),
      bytesStaged: z.number().optional(),
      targetBuildId: z.number().optional(),
      autoUpdateBehavior: z.number().optional(),
      allowOtherDownloadsWhileRunning: z.number().optional(),
      scheduledAutoUpdate: z.number().optional(),
      sharedDepots: z.record(z.union([z.string(), z.number()])).optional(),
      installedDepots: z.record(
        toCamelCaseKeys(
          z.object({
            manifest: z.number().optional(),
            size: z.number().optional(),
          }).passthrough(),
        ),
      ).optional(),
      stagedDepots: z.record(
        toCamelCaseKeys(
          z.object({
            manifest: z.number().optional(),
            size: z.number().optional(),
            dlcappid: z.number().optional(),
          }).passthrough(),
        ),
      ).optional(),
      dlcDownloads: z.record(
        toCamelCaseKeys(
          z.object({
            bytesDownloaded: z.number().optional(),
            bytesToDownload: z.number().optional(),
          }).passthrough(),
        ),
      ).optional(),
      userConfig: manifestConfigSchema.optional(),
      mountedConfig: manifestConfigSchema.optional(),
    })),
  })
    .passthrough(),
);

/** A parsed Steam app manifest. */
export type AppManifest = z.infer<typeof appManifestSchema>;
