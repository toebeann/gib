#!/bin/sh
# Shell script to make sure matching deno version is installed before running the deno script
# Copyright 2023 Tobey Blaber. All rights reserved.
# TODO: Keep this script simple and easy to audit.

deno_target_version="1.38.0"
deno_max_version=$(($(echo $deno_target_version | cut -d '.' -f1) + 1))

set -e # exit on err

# simple version string to integer for comparison
# supports 3 segments, with 5 digits per segment
version() {
    echo "$@" | awk -F. '{ printf("%d%05d%05d\n", $1,$2,$3); }'
}

if ! command -v deno >/dev/null; then # if no deno command, add expected deno environment variables and try again
    export DENO_INSTALL="${HOME}/.deno"
    export PATH="${DENO_INSTALL}/bin:${PATH}"
fi

if ! command -v deno >/dev/null; then # deno couldn't be found at expected path, let's just install the latet version
    echo "Installing deno..."
    curl -fsSL https://deno.land/x/install/install.sh | sh >/dev/null
fi

# try to get installed deno version
# this will likely break if deno ever changes the output format of the deno --version command
deno_current_version=$(deno --version | sed 1q | cut -d ' ' -f2)

# parse version strings into integers for numeric comparison
parsed_deno_current_version=$(version $deno_current_version)
parsed_deno_target_version=$(version $deno_target_version)
parsed_deno_max_version=$(version $deno_max_version)

# check installed deno version matches requirements and offer to up/downgrade otherwise
if [ $parsed_deno_current_version -lt $parsed_deno_target_version ] || [ $parsed_deno_current_version -gt $parsed_deno_max_version ]; then
    echo "Warning: deno version mismatch - v${deno_target_version} required, found v${deno_current_version}"

    tput sc # store cursor position
    while true; do
        read -rs -p "Would you like to install deno v${deno_target_version}? [Y/n] " -n1 yn </dev/tty

        # treat enter, esc, space etc as positive input
        if [[ $yn = "" ]]; then
            yn=y
        fi

        case $yn in
        [Yy]*)
            echo "Yes\n"
            deno upgrade --version "$deno_target_version"
            break
            ;;
        [Nn]*)
            echo "No"
            echo "Error: deno version unsupported" 1>&2
            exit 1
            ;;
        esac

        # jump back to stored cursor position
        tput rc 1
        tput el
    done
fi

# all set. user should now run the run.ts script with deno
# e.g. deno run --allow-all https://cdn.jsdelivr.net/gh/toebeann/gib/mod.ts
