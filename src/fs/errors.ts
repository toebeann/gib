/** Path is not a folder */
export class PathNotAFolderError extends Error {
  override name = PathNotAFolderError.name;
  constructor(readonly path: string, options?: ErrorOptions) {
    super("Path is not a folder", options);
  }
}

/** Could not find path */
export class PathNotFoundError extends Error {
  override name = PathNotFoundError.name;
  constructor(readonly path: string, options?: ErrorOptions) {
    super("Could not find path", options);
  }
}

/** Unknown error validating path */
export class UnknownPathError extends Error {
  override name = UnknownPathError.name;
  constructor(readonly path: string, options?: ErrorOptions) {
    super("Unknown error validating path", options);
  }
}
