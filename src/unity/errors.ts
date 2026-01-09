/** Could not find a valid Unity app */
export class InvalidUnityApp extends Error {
  override name = InvalidUnityApp.name;
  constructor(readonly path: string, options?: ErrorOptions) {
    super("Could not find a valid Unity app", options);
  }
}

/** Multiple Unity apps found */
export class MultipleUnityAppsFoundError extends Error {
  override name = MultipleUnityAppsFoundError.name;
  constructor(readonly apps: string[], options?: ErrorOptions) {
    super("Multiple Unity apps found", options);
  }
}

/** App does not appear to be a Unity game */
export class NotAUnityAppError extends Error {
  override name = NotAUnityAppError.name;
  constructor(readonly path: string, options?: ErrorOptions) {
    super("App does not appear to be a Unity game", options);
  }
}
