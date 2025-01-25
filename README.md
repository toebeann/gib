# gib

[<img alt="Usage statistics for gib from the jsDelivr CDN" src="https://data.jsdelivr.com/v1/package/gh/toebeann/gib/badge">](https://www.jsdelivr.com/package/gh/toebeann/gib?tab=stats)

gib _(tobey's Guided Installer for BepInEx)_ is a TUI application for automating
the installation of [BepInEx](https://github.com/BepInEx/BepInEx), the popular
modding framework for Unity games.

![Running gib in the Terminal](https://github.com/toebeann/gib/assets/45315526/1325c6cf-b057-4491-8826-37a54a05affd)

Currently only macOS is supported, as the process of manual BepInEx installation
is _exceptionally_ cumbersome on this operating system.

gib aims to automate whatever it can, and hold your hand through whatever it
cannot.

Supports both Intel-based and Apple Silicon chips.

## Table of Contents

- [gib](#gib)
  - [Table of Contents](#table-of-contents)
  - [Usage](#usage)
    - [Quick Start](#quick-start)
    - [Walkthrough](#walkthrough)
      - [Prerequisites](#prerequisites)
      - [Running gib](#running-gib)
  - [Caveats](#caveats)
  - [Known Issues](#known-issues)
  - [License](#license)

## Usage

### Quick Start

Just run the following command in Terminal:

```sh
curl -fsSL https://cdn.jsdelivr.net/gh/toebeann/gib/gib.sh | bash
```

This command will make sure that [bun](https://bun.sh/) (a speedy JavaScript
runtime) is installed, then install and run the latest version of gib with it.
If you're curious how it all works or want to verify the source code is safe,
check [`gib.sh`](https://github.com/toebeann/gib/blob/main/gib.sh) and
[`index.ts`](https://github.com/toebeann/gib/blob/main/src/cli/index.ts) for
details.

If you get stuck, refer to the below [walkthrough](#walkthrough).

### Walkthrough

> [!TIP]\
> If you run into any unexpected issues while following these instructions or
> need further assistance, please feel free to send a DM on discord to `toebean`
> (that's me) explaining the issue and I'll reply when I remember to check my
> message requests.

> [!NOTE]\
> These usage instructions were written for macOS Sonoma. The instructions below
> should work for other versions of macOS, but there may be some slight
> differences.

#### Prerequisites

- You'll want a Finder window open at the folder where the game is installed.

  - If you own the game on Steam (i.e. you _didn't_ add the game to Steam as a
    non-Steam game), find the game in your library, then right-click it and
    select `Manage` -> `Browse local files`.

  - For the Epic Games Launcher, find the game in your library, then right-click
    it and select `Manage`. In the window that opens, look for the folder icon
    and click it.

  - For games you typically launch with Spotlight, search for the game as usual
    in Spotlight, and when the game is highlighted in the drop-down, hold `⌘`
    until the icon changes to Finder. With `⌘` still held down, press `Enter`.

- You'll want a copy of BepInEx downloaded and unzipped in your Downloads
  folder.

  If you're unsure where to get BepInEx from, try a Google search for
  `[game name] bepinex pack`, e.g. for Subnautica, I would search for:

  ```
  Subnautica BepInEx pack
  ```

  Where available, it is always advised to use a popular pack of BepInEx which
  has been tailored to the specific game you're trying to mod.

  If you can't find a BepInEx pack for the game, then the latest stable version
  of BepInEx from their official GitHub repo will do.
  [You can find it here](https://github.com/BepInEx/BepInEx/releases/latest) -
  scroll down to the `Assets` section, then download the file with "unix" or
  "macos_x64" in the name, e.g. `BepInEx_unix_5.4.22.0.zip`,
  `BepInEx_macos_x64_5.4.23.2.zip`

  Make sure it is unzipped in your Downloads folder after downloading it, as
  presently gib requires this. By default, Safari will have unzipped it for you.
  If you use other browsers, simply open the .zip and macOS should unzip it for
  you.

  Go ahead and open a Finder window in the unzipped BepInEx folder, so that you
  can see the file `run_bepinex.sh`.

  Leave this Finder window open - you'll want to come back to it later.

  <img width="920" alt="A screenshot of Finder window open at the location of BepInEx's run_bepinex.sh " src="https://github.com/toebeann/gib/assets/45315526/8b961265-2fd2-4017-85fb-2c91369a825f">

> [!TIP]\
> In some cases the shell script to load BepInEx may be named something else,
> e.g. `start_game_bepinex.sh` - in this case you will need to rename it to
> `run_bepinex.sh` for gib to recognise it.

#### Running gib

1. Open Terminal from Launchpad or Spotlight (press `⌘ Space`, type `terminal`
   and press `Enter`).

   <img width="600" alt="Searching for Terminal with macOS Spotlight" src="https://github.com/toebeann/BepInEx.Subnautica/assets/45315526/f374da75-5c74-4b49-99c2-25daa296c504">

1. Copy the command from the [Quick Start](#quick-start) section above and paste
   it in your terminal window with `⌘ V`, then press `Enter` to run it.

   <img width="585" alt="Running gib in the Terminal" src="https://github.com/toebeann/gib/assets/45315526/1325c6cf-b057-4491-8826-37a54a05affd">

1. Now, simply follow the instructions in the terminal to install BepInEx to
   your game!

> [!TIP]\
> You can press `⌃ C` at any time in the terminal to abort.

> [!TIP]\
> If you ran into any unexpected issues while following these instructions or
> need further assistance, please feel free to send a DM on discord to `toebean`
> (that's me) explaining the issue and I'll reply when I remember to check my
> message requests.

## Caveats

- Only native macOS applications are currently supported.

  - Support for Windows apps on macOS (e.g. via CrossOver or Wine) is being
    considered.

  - Support for other operating systems is being considered.

- Only BepInEx 5 is currently supported. Support for BepInEx 6 is being
  considered.

- Users on Apple Silicon sometimes report that their game performance seems to
  diminish with only BepInEx installed. This is due to the fact that BepInEx is
  built for Intel-based chips, and therefore your Apple Silicon chip needs to
  run it through Rosetta. Unfortunately, there is nothing gib can do to resolve
  this, since BepInEx does not currently support Apple Silicon. If you find the
  performance impact too drastic, your only other option might be to use a
  Windows emulator like Parallels Desktop, Wine via Whisky or HyperPlay etc.,
  and then install and run the Windows versions of both the game and BepInEx.

## Known Issues

- If the shell script to launch BepInEx is named something other than
  `run_bepinex.sh` (e.g. `start_game_bepinex.sh`), gib will not recognise it. I
  plan to fix this in an update. In the meantime, you can workaround this by
  renaming the shell script to `run_bepinex.sh` as needed.

- Relative paths are currently not supported and providing them will lead to
  strange issues. If you encounter an issue after having provided a relative
  path, please run the script again, this time providing absolute paths. You can
  provide absolute paths easily by simply highlighting the file in Finder,
  pressing `Option Command C`, then `Command V` in terminal to paste.

## License

gib is licensed under the
[ISC License](https://github.com/toebeann/gib?tab=ISC-1-ov-file#readme).
