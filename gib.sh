#!/bin/sh
#
# This file is a shell script to ensure a user has pnpm & node installed,
# before using them to install and launch the gib CLI.
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

{ # this ensures the entire script is downloaded #
    set -e # exit on err

    # ensure pnpm is installed and up-to-date
    echo "Preparing pnpm..."
    curl -fsSL https://get.pnpm.io/install.sh | sh - >/dev/null

    # ensure pnpm env vars are set
    if [ -z "$PNPM_HOME" ]; then
        export PNPM_HOME="$HOME/Library/pnpm"
    fi

    # ensure PATH contains pnpm home
    case ":$PATH:" in
        *":$PNPM_HOME:"*) ;;
        *) export PATH="$PNPM_HOME:$PATH" ;;
    esac

    # check for pnpm command and ask user to reload terminal if not found
    if ! command -v pnpm >/dev/null; then
        echo "pnpm not found in PATH"
        echo "Please reload your terminal, then run this script again"
        exit 1
    fi

    # ensure node v20 is in use
    echo "Preparing node..."
    pnpm env use --global 20 >/dev/null

    if [ -n "${GIB_VERSION}" ]; then
        version="${GIB_VERSION}"
    else
        version="^0.1.4"
    fi

    # ensure gib is up-to-date, then launch it
    echo "Preparing and launching gib..."
    pnpm -s --package=tsx --package=toebeann/gib\#semver:${version} dlx gib
} # this ensures the entire script is downloaded #
