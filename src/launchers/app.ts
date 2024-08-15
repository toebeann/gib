/** An app data manifest. */
export type AppManifest = Record<string, unknown> | undefined;

/**
 * An abstraction for working with an app/game, managed by a launcher and
 * installed on this computer.
 */
export interface App<
  TManifest extends AppManifest = undefined,
> {
  /** An id which identifies the app with its launcher. */
  readonly id: string;

  /** The name of the app displayed to the user. */
  readonly name: string;

  /** The path of the folder where the app is installed on this computer. */
  readonly path: string;

  /** The launcher which installed and manages the app. */
  readonly launcher: string;

  /** The data manifest the launcher holds about the app. */
  readonly manifest: TManifest;
}
