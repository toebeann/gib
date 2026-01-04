# gib

[<img alt="Usage statistics for gib from the jsDelivr CDN" src="https://data.jsdelivr.com/v1/package/gh/toebeann/gib/badge">](https://www.jsdelivr.com/package/gh/toebeann/gib?tab=stats)

gib _(tobey's Guided Installer for BepInEx)_ is a TUI application for automating
the installation of [BepInEx](https://github.com/BepInEx/BepInEx), the popular
modding framework for Unity games.

To get started, just run the following command in Terminal:

```sh
curl -fsSL https://cdn.jsdelivr.net/gh/toebeann/gib/gib.sh | bash
```

![Running gib in the Terminal](https://github.com/toebeann/gib/assets/45315526/1325c6cf-b057-4491-8826-37a54a05affd)

gib aims to automate whatever it can, and hold your hand through whatever it
cannot. Check the [Features](#features) section for details.

Currently only macOS is supported, as the process of manual BepInEx installation
is _exceptionally_ cumbersome on this operating system. Both Intel-based and
Apple Silicon processors are supported, provided you are running on macOS 13
(Ventura) or later. For other limitations, see the [Caveats](#caveats) section.

## Table of contents

- [gib](#gib)
  - [Table of contents](#table-of-contents)
  - [Features](#features)
  - [Usage](#usage)
    - [Quick start](#quick-start)
    - [Walkthrough](#walkthrough)
      - [Prerequisites](#prerequisites)
      - [Running gib](#running-gib)
  - [Temporarily disabling mods for a game](#temporarily-disabling-mods-for-a-game)
    - [Re-enabling mods after disabling them](#re-enabling-mods-after-disabling-them)
  - [Uninstallation](#uninstallation)
    - [Uninstalling BepInEx](#uninstalling-bepinex)
      - [Clearing Steam launch options](#clearing-steam-launch-options)
      - [Removing Steam shortcuts](#removing-steam-shortcuts)
      - [Removing shortcuts from Applications](#removing-shortcuts-from-applications)
      - [Removing BepInEx from the game folder](#removing-bepinex-from-the-game-folder)
    - [Uninstalling gib](#uninstalling-gib)
  - [Caveats](#caveats)
  - [Known issues](#known-issues)
  - [License](#license)

## Features

- Completely automates the process of installing BepInEx 5 for native unix
  builds of Unity games on macOS - no more falling asleep or pulling your hair
  out with frustration while trying to
  [install it manually](https://github.com/toebeann/BepInEx.Subnautica/wiki/Idiot's-guide-to-macOS-installation#manual-installation)!
- Takes care of all the annoying stuff like making the run script executable and
  giving permission to run BepInEx which is where most people give up when
  installing manually!
- Implements workarounds for common macOS-specific issues when using BepInEx!
- After installing BepInEx, runs an automated test to check that BepInEx is
  actually loading when you run the game, so you know that everything is working
  as it's supposed to!
- Nifty Steam integrations:

  - Automatically configures the launch options to run Steam games with BepInEx!
  - Optionally adds Steam shortcuts to run Steam games vanilla (without mods) or
    non-Steam games with mods!

    _**Note:** The Steam shortcuts feature is experimental, please see
    [Caveats](#caveats) below for details._

## Usage

### Quick start

Just run the following command in Terminal:

```sh
curl -fsSL https://cdn.jsdelivr.net/gh/toebeann/gib/gib.sh | bash
```

This command will install and launch gib. After this command has completed, to
run gib in future you can simply run the command `gib` in Terminal instead.
**Note:** You will need to reload the Terminal for this change to take effect.

If you're curious how it all works or want to verify the source code is safe,
check [`gib.sh`](https://github.com/toebeann/gib/blob/main/gib.sh) and
[`index.ts`](https://github.com/toebeann/gib/blob/main/src/cli/index.ts) for
details.

If you get stuck, refer to the below [walkthrough](#walkthrough).

### Walkthrough

> [!TIP]\
> If you run into any unexpected issues while following these instructions or
> need further assistance, please feel free to
> [open an issue](https://github.com/toebeann/gib/issues/new/choose) describing
> what happened, ideally providing the output from running gib, and I'll help
> when I can.

> [!NOTE]\
> These usage instructions were originally written with macOS Sonoma in mind.
> The instructions below should work for other versions of macOS, but there may
> be some slight differences.

#### Prerequisites

- You'll want a Finder window open at the folder where the game is installed.

  - If you own the game on Steam, find the game in your library, then
    right-click it and select `Manage` -> `Browse local files`.

  - For the Epic Games Launcher, find the game in your library, then right-click
    it and select `Manage`. In the window that opens, look for the folder icon
    and click it.

  - For games you typically launch with Spotlight, search for the game as usual
    in Spotlight, and when the game is highlighted in the drop-down, hold
    `Command` until the icon changes to Finder. With `Command` still held down,
    press `Enter`.

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

1. Open Terminal from Launchpad or Spotlight (press `Command Space`, type
   `terminal` and press `Enter`).

   <img width="600" alt="Searching for Terminal with macOS Spotlight" src="https://github.com/toebeann/BepInEx.Subnautica/assets/45315526/f374da75-5c74-4b49-99c2-25daa296c504">

2. Copy the command from the [Quick start](#quick-start) section above and paste
   it in your terminal window with `Command V`, then press `Enter` to run it.

   <img width="585" alt="Running gib in the Terminal" src="https://github.com/toebeann/gib/assets/45315526/1325c6cf-b057-4491-8826-37a54a05affd">

3. Now, simply follow the instructions in the terminal to install BepInEx to
   your game!

> [!TIP]\
> You can press `Control C` at any time in the terminal to abort.

> [!TIP]\
> If you ran into any unexpected issues while following these instructions or
> need further assistance, please feel free to
> [open an issue](https://github.com/toebeann/gib/issues/new/choose) describing
> what happened, ideally providing the output from running gib, and I'll help
> when I can.

## Temporarily disabling mods for a game

> [!NOTE]\
> Please note that this section only applies to Steam games, For non-Steam
> games, you can simply run the game normally - _without_ Steam - and it should
> launch vanilla.

If you have installed BepInEx with gib for a Steam game, you will have been
given the option to add a shortcut to Steam to launch the game without mods
(vanilla). However, this feature is experimental and for some games, it
unfortunately cannot work due to the way the game is coded. Or, you may simply
have declined the option and now find that you do indeed want to run the game
without mods temporarily.

In either case, you can temporarily disable mods by following these steps:

1. Locate the game in your Steam library, then right-click it and choose
   `Properties...`
2. In the `General` tab of the window which opens, there should be a text input
   for launch options. Add the following text to the _beginning_ of the text
   field, so that it comes before _any_ other text:
   ```sh
   %command% #
   ```
3. Close the window.

Now, when you run the game with Steam, it should run without any mods. If you
instead get an error when you try to launch the game, it means you made a
mistake when you were editing the launch options. Make sure that `%command% #`
comes before _any_ other text in the launch options!

You may want to
[remove the vanilla shortcut for the game](#removing-steam-shortcuts), if you
added one when running gib.

### Re-enabling mods after disabling them

To re-enable mods after
[temporarily disabling them](#temporarily-disabling-mods-for-a-game), you simply
need to undo the changes you made to the launch options:

1. Locate the game in your Steam library, then right-click it and choose
   `Properties...`
2. In the `General` tab of the window which opens, there should be a text input
   for launch options. **Delete** the following text, which should be at the
   start of the line:
   ```sh
   %command% #
   ```
3. Close the window.

The game should now run with mods once more when launched through Steam. If you
get an error when you try to launch the game, it means you made a mistake when
editing the launch options. If you can't seem to fix it, you will need to run
gib again to reinstall BepInEx for the game - don't delete any files, just run
the gib command again and it will fix the launch options for you - you won't
lose any mods or anything.

## Uninstallation

### Uninstalling BepInEx

At present, uninstalling BepInEx is an entirely manual process which gib cannot
automate, but it is fairly straightforward:

1. Undo any changes gib made to your Steam library:
   - **Steam games:**
     [clear the launch options](#clearing-steam-launch-options), and
     [remove the vanilla shortcut added during instalation](#removing-steam-shortcuts),
     if applicable.
   - **Non-Steam games:**
     [remove the Steam shortcut to launch the game with BepInEx]((#removing-steam-shortcuts)),
     if applicable.
2. You should also
   [remove the shortcuts added to your Applications folder by gib for the game](#removing-shortcuts-from-applications).
3. Optionally, you can reclaim the disk space used by BepInEx and your mods by
   [removing BepInEx from the game folder](#removing-bepinex-from-the-game-folder).
   As long as you've followed the previous steps this is entirely optional, but
   probably a good idea since mods can take up a lot of space - and this _isn't_
   taken care of for you when you uninstall the game!

#### Clearing Steam launch options

> [!NOTE]\
> Please note that this section only applies to Steam games.

To uninstall BepInEx from Steam games, we need to clear the launch options for
the game which are responsible for injecting BepInEx when we launch the game
from Steam:

1. Locate the game in your Steam library, then right-click it and choose
   `Properties...`
2. In the `General` tab of the window which opens, there should be a text input
   for launch options. Click into the text box, press `Command A` to select all
   text, then `Backspace` or `Delete` to clear the launch options.
3. Close the window.

Now, when you launch the game with Steam it will launch completely vanilla, with
no mods.

#### Removing Steam shortcuts

When setting up BepInEx you may have optionally added a Steam shortcut, e.g. for
Steam games you can add an optional shortcut to launch the game without mods
(vanilla), and for non-Steam games it is often preferable to set up a Steam
shortcut to launch the game with mods.

In either case, if you're uninstalling BepInEx from the game you likely want to
get rid of these shortcuts. To do so, follow these steps:

1. Locate the shortcut in your Steam library. If you have trouble finding it,
   you can use the search bar at the top to search for `(Vanilla)` or
   `(BepInEx)` as applicable.
2. Right-click the shortcut in your library and choose `Manage` ->
   `Remove non-Steam game from your library`.

#### Removing shortcuts from Applications

When setting up BepInEx with gib, it often adds shortcuts to your Applications
folder for easy use from Launchpad or Spotlight. If you're no longer planning to
use BepInEx with the game, you should remove these shortcuts. To do so, follow
these steps:

1. Open Spotlight with `Command Space`, start typing the name until you find the
   shortcut - it will have the suffix `(Vanilla)` or `(BepInEx)`. If you can't
   find it then you don't have one and can skip this.
2. With the shortcut selected in Spotlight, hold `Command` until the icon
   changes to Finder. With `Command` still held down, press `Enter`.
3. You should find yourself in a Finder window at the location of the shortcut.
   Simply delete it as normal.

#### Removing BepInEx from the game folder

> [!IMPORTANT]\
> Make sure you follow the first two steps of
> [Uninstalling BepInEx](#uninstalling-bepinex) section before doing this.

If you want to reclaim the disk space taken up by BepInEx and the mods you're no
longer using, here are instructions on how to completely remove BepInEx and all
mods from the game folder:

1. Navigate to the game folder in Finder, the same way you found it when
   installing BepInEx. If you can't remember how to find it, check the
   [Prerequisites](#prerequisites) section for instructions.
2. Delete the following files if present:
   - `changelog.txt`
   - `doorstop_config.ini`
   - `libdoorstop.dylib`
   - `run_bepinex.sh`
   - `winhttp.dll`
3. Delete the following folders if present:
   - `doorstop_libs`
   - `corlibs`
4. Finally, delete the `BepInEx` folder itself. Be aware that deleting this
   folder will delete not only BepInEx but also all mods you had installed, and
   any stored configuration of those mods.

### Uninstalling gib

> [!NOTE]\
> Uninstalling gib itself is entirely optional and will not uninstall BepInEx,
> nor any mods you have installed for any games. For that, see
> [Uninstalling BepInEx](#uninstalling-bepinex).

As of gib v0.8, gib is a single-file executable created with
[bun](https://bun.sh/) which takes up a negligible ~70 MB of space.

If you do want to uninstall gib for the miniscule space saving, simply execute
the following command in Terminal:

```sh
rm -rf ~/.gib
```

## Caveats

- Steam shortcuts are an experimental feature and may not work with all games -
  particularly the shortcuts to launch the game vanilla (without mods). For
  non-Steam games this isn't an issue - you can simply launch the game
  "normally" (_without_ Steam) and as such we don't offer to create a vanilla
  shortcut. For Steam games however this can be irksome if we want to
  occasionally run the game without mods.

  If the vanilla shortcut does not work for one of your Steam games, you are
  encouraged to [remove the vanilla shortcut](#removing-steam-shortcuts) and
  follow the guide to
  [temporarily disable mods for the game](#temporarily-disabling-mods-for-a-game).

- Only native macOS applications are currently supported.

  - Support for Windows apps on macOS (e.g. via Wine-based solutions like
    CrossOver) is being considered.

  - Support for other operating systems is being considered.

- Only BepInEx 5 is currently supported. Support for BepInEx 6 is being
  considered.

- Users on Apple Silicon sometimes report that their game performance seems to
  diminish with only BepInEx installed. This is due to the fact that BepInEx is
  built for Intel-based chips, and therefore your Apple Silicon chip needs to
  run it through Rosetta. Unfortunately, there is nothing gib can do to resolve
  this, since BepInEx does not currently support Apple Silicon. You could try
  running the Windows version of the game (and likewise installing the Windows
  build of BepInEx) to see if that helps things at all. My recommendation would
  be to prefer a Wine-based solution such as CrossOver over VMs like Parallels
  Desktop, as VM-based solutions will introduce more performance bottlenecks,
  though they are typically more convenient to get running. With a Wine-based
  approach, make sure you additionally configure Wine to inject BepInEx when the
  game launches by setting `winhttp` as a DLL override from the `Libraries` tab
  of the game's Wine Configuration, otherwise the game will run without BepInEx
  and thus without mods. Google how to access the Wine Configuration via
  whatever Wine-based solution you're using if you're unsure how, e.g. "access
  Wine Configuration via CrossOver". You also probably will need to Google "how
  to install Windows versions of Steam games on mac with CrossOver" or similar
  to get started.

## Known issues

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
