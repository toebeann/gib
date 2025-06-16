type Config = {
  language?: string;
  BetaKey?: string;
};

type Depot = {
  manifest?: number;
  size?: number;
};

/** A parsed Steam app manifest. */
export type AppManifest = {
  AppState: {
    appid: number;
    name: string;
    installdir: string;
    StateFlags: number;
    universe: number;
    LastUpdated?: number;
    SizeOnDisk?: number;
    StagingSize?: number;
    buildid?: number;
    LastOwner?: number;
    UpdateResult?: number;
    BytesToDownload?: number;
    BytesDownloaded?: number;
    BytesToStage?: number;
    BytesStaged?: number;
    TargetBuildID?: number;
    AutoUpdateBehavior?: number;
    AllowOtherDownloadsWhileRunning?: 0 | 1;
    ScheduledAutoUpdate?: number;
    SharedDepots?: Record<string, string | number>;
    InstalledDepots?: Record<string, Depot>;
    StagedDepots?: Record<string, Depot & { dlcappid?: number }>;
    DlcDownloads?: Record<string, {
      BytesDownloaded?: number;
      BytesToDownload?: number;
    }>;
    UserConfig?: Config;
    MountedConfig?: Config;
  };
};
