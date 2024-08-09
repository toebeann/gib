import type { platform } from "node:process";
import type { App, AppManifest } from "./app.ts";

/**
 * An abstraction for working with an app launcher,
 * e.g. Steam, Epic Games Launcher, etc.
 */
export interface Launcher<
  TManifest extends AppManifest = undefined,
> {
  /** The name of the launcher. */
  readonly name: string;

  /** The platforms on which interfacing with this launcher is supported. */
  readonly supportedPlatforms: typeof platform[];

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
