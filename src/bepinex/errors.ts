/** Could not find a valid BepInEx pack */
export class InvalidBepInExPack extends Error {
  override name = InvalidBepInExPack.name;
  constructor(readonly path: string, options?: ErrorOptions) {
    super("Could not find a valid BepInEx pack", options);
  }
}

/** Not a valid BepInEx run script */
export class InvalidDoorstopScript extends Error {
  override name = InvalidDoorstopScript.name;
  constructor(readonly path: string, options?: ErrorOptions) {
    super("Not a valid BepInEx run script", options);
  }
}

/** BepInEx run script does not support {@link platform} */
export class DoorstopScriptMissingPlatformSupport extends Error {
  override name = DoorstopScriptMissingPlatformSupport.name;
  constructor(
    readonly path: string,
    readonly platform: string = process.platform,
    options?: ErrorOptions,
  ) {
    super(`BepInEx run script does not support ${platform}`, options);
  }
}
