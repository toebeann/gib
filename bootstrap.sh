#!/bin/sh
#
# This file is a shell script to ensure a user has deno installed,
# and that its version matches the intended.
#
# Where possible, it will offer to up/downgrade deno if necessary.
#
# The intended use case is for the script to be called directly before
# running a deno script.
#
###############################################################################
#
# ISC License
#
# Copyright 2023 Tobey Blaber
#
# Permission to use, copy, modify and/or distribute this software for any
# purpose with or without fee is hereby granted, provided that the above
# copyright notice and this permission notice appear in all copies.
#
# THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
# WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
# MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
# ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
# WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
# ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
# OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
#
###############################################################################

# TODO: Keep this script simple and easy to audit.

deno_target_version="1.37.2"
deno_max_version=$(($(echo $deno_target_version | cut -d '.' -f1) + 1))

set -e # exit on err

# simple version string to integer for comparison
# supports 3 segments, with 5 digits per segment
version() {
    echo "$@" | awk -F. '{ printf("%d%05d%05d\n", $1,$2,$3); }'
}

# if no deno command, add expected deno environment variables and try again
if ! command -v deno >/dev/null; then
    export DENO_INSTALL="${HOME}/.deno"
    export PATH="${DENO_INSTALL}/bin:${PATH}"
fi

# deno couldn't be found at expected path, let's just install the latest version
if ! command -v deno >/dev/null; then
    echo "Installing deno..."
    curl -fsSL https://deno.land/x/install/install.sh | sh >/dev/null
fi

# try to get installed deno version
# this will likely break if deno ever changes the output format of
# the deno --version command
deno_current_version=$(deno --version | sed 1q | cut -d ' ' -f2)

# parse version strings into integers for numeric comparison
parsed_deno_current_version=$(version $deno_current_version)
parsed_deno_target_version=$(version $deno_target_version)
parsed_deno_max_version=$(version $deno_max_version)

# check installed deno version matches requirements
if [ $parsed_deno_current_version -lt $parsed_deno_target_version ] ||
    [ $parsed_deno_current_version -gt $parsed_deno_max_version ]; then
    echo "Warning: deno version mismatch - v${deno_target_version} required"
    echo "Found v${deno_current_version}"

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
            set +e
            deno upgrade --version "$deno_target_version" 2>/dev/null
            brew upgrade deno 2>/dev/null
            set -e
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
