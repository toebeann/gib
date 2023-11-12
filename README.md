# gib

gib _(tobey's Guided Installer for BepInEx)_ is a deno script for automating the installation of BepInEx, the popular modding framework for Unity games.

Currently only macOS is supported, as the process of manual BepInEx installation is _exceptionally_ cumbersome on this operating system.

gib aims to automate whatever it can, and hold your hand through whatever it cannot.

## Usage

**ℹ️ These usage instructions were written for macOS Sonoma. The instructions below should work for other versions of macOS, but there may be some slight differences.**

If you run into any unexpected issues while following these instructions or need further assistance, please feel free to send a DM on discord to `toebean` (that's me) explaining the issue and I'll reply when I remember to check my message requests.

### Prerequisites

1. If you don't own the game on Steam, you'll need to add it to Steam as a non-Steam game. Follow [the guide to add a non-Steam game to Steam](https://github.com/toebeann/gib/wiki/Adding-non%E2%80%90Steam-games-to-Steam) if you're unsure how.
   
1. You'll want a Finder window open at the folder where the game is installed.
   
   * If you own the game on Steam (i.e. you _didn't_ add the game to Steam as a non-Steam game), find the game in your library, then right-click it and select `Manage` -> `Browse local files`.
   * For the Epic Games Launcher, find the game in your library, then right-click it and select `Manage`. In the window that opens, look for the folder icon and click it.
   
1. You'll want a copy of BepInEx downloaded and unzipped in your Downloads folder.
   
   If you're unsure where to get BepInEx from, try a Google search for `[game name] bepinex pack`, e.g. for Subnautica, I would search for:
   ```
   Subnautica BepInEx pack
   ```
   
   Where available, it is always advised to use a popular pack of BepInEx which has been tailored to the specific game you're trying to mod.
   
   If you can't find a BepInEx pack for the game, then the latest stable version of BepInEx from their official GitHub repo will do. [You can find it here](https://github.com/BepInEx/BepInEx/releases/latest) - scroll down to the `Assets` section, then download the file with "unix" in the name, e.g. `BepInEx_unix_5.4.22.zip`.
   
   Make sure it is unzipped in your Downloads folder after downloading it, as presently gib requires this. By default, Safari will have unzipped it for you. If you use other browsers, simply open the .zip and macOS should unzip it for you.
   
   Go ahead and open a Finder window in the unzipped BepInEx folder, so that you can see the file `run_bepinex.sh`. Leave this Finder window open - you'll want to come back to it later.
   
   <img width="920" alt="A screenshot of Finder window open at the location of BepInEx's run_bepinex.sh " src="https://github.com/toebeann/gib/assets/45315526/8b961265-2fd2-4017-85fb-2c91369a825f">
   
### Running gib

1. Open Terminal from Launchpad by pressing `⌘ Space`, typing `terminal` and pressing `Enter`.
   
   <img width="600" alt="Searching for Terminal in macOS Launchpad" src="https://github.com/toebeann/BepInEx.Subnautica/assets/45315526/f374da75-5c74-4b49-99c2-25daa296c504">
   
   **ℹ️** _These instructions haven't been tested with iTerm2 or other terminal apps. Use the standard terminal if you have problems._
   
1. Copy the following command, and paste it in your terminal window with `⌘V`, then press `Enter` to run it.
   
   ```sh
   curl -fsSL https://cdn.jsdelivr.net/gh/toebeann/gib/bootstrap.sh | sh && PATH="$HOME/.deno/bin:$PATH" && deno run --allow-env --allow-run=deno,pbcopy,/bin/sh --allow-read --allow-sys=uid --allow-write --reload=https://cdn.jsdelivr.net/gh/toebeann/gib/mod.ts https://cdn.jsdelivr.net/gh/toebeann/gib/mod.ts
   ```
   
   **ℹ️** _This command will make sure that [deno](https://deno.land/) (a Java runtime similar to Node.js) is installed, then run the latest version of gib with it. If you're curious how it all works or want to verify the source code is safe, check [`bootstrap.sh`](https://github.com/toebeann/gib/blob/main/bootstrap.sh) and [`mod.ts`](https://github.com/toebeann/gib/blob/main/mod.ts) for details._
   
   <img width="585" alt="Running gib in the Terminal" src="https://github.com/toebeann/gib/assets/45315526/7ce16628-167c-482a-8dc8-4eabaa4a55b2">
   
1. Now, simply follow the instructions in the terminal to install BepInEx to your game!

If you ran into any unexpected issues while following these instructions or need further assistance, please feel free to send a DM on discord to `toebean` (that's me) explaining the issue and I'll reply when I remember to check my message requests.

## License

gib is licensed under the [ISC License](https://github.com/toebeann/gib/blob/main/LICENSE).