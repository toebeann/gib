/** An app data manifest. */
export type AppManifest = Record<string, unknown> | undefined;

/**
 * An abstraction for working with an app/game, managed by a launcher and
 * installed on this computer.
 */
export interface App<
  TLauncher extends Launcher<TManifest>,
  TManifest extends AppManifest = undefined,
> {
  /** An id which identifies the app with its launcher. */
  readonly id: string;

  /** The name of the app displayed to the user. */
  readonly name: string;

  /** The path of the folder where the app is installed on this computer. */
  readonly path: string;

  /** The launcher which installed and manages the app. */
  readonly launcher: TLauncher;

  /** The data manifest the launcher holds about the app. */
  readonly manifest: TManifest;

  /** Launches the app with its launcher. */
  launch?(): Promise<void>;
}

/**
 * An abstraction for working with an app launcher,
 * e.g. Steam, Epic Games Launcher, etc.
 */
export interface Launcher<
  TManifest extends AppManifest = undefined,
> {
  /** The name of the launcher. */
  readonly name: string;

  /** Determines whether the launcher appears to be installed. */
  isInstalled?(): Promise<boolean>;

  /**
   * Gets information about apps which are installed on this computer and
   * managed by the launcher.
   */
  getApps(): AsyncGenerator<App<Launcher<TManifest>, TManifest>, void>;

  /**
   * Gets information about a specific app installed on this computer and
   * managed by the launcher.
   *
   * Returns `undefined` if the app could not be found.
   *
   * @param id The id which identifies the app with the launcher.
   */
  getApp(
    id: string,
  ): Promise<App<Launcher<TManifest>, TManifest> | void | undefined>;

  /**
   * Launches a specific app which is managed by the launcher.
   *
   * @param app The app to launch.
   */
  launch?(app: App<Launcher<TManifest>, TManifest>): Promise<void>;

  /**
   * Launches a specific app which is managed by the launcher.
   *
   * @param id The id which identifies the app with the launcher.
   */
  launch?(id: string): Promise<void>;
}
