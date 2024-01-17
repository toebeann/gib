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

{
    set -e # exit on err

    # ensure pnpm is installed
    if ! command -v pnpm >/dev/null; then
        echo "Installing pnpm..."
        curl -fsSL https://get.pnpm.io/install.sh | sh - >/dev/null
        source ~/.zshrc
    fi

    if ! command -v pnpm >/dev/null; then
        echo "Couldn't automatically set pnpm in your path"
        echo "Please run the command below to add it to your path, then run this script again"
        echo "source ~/.zshrc"
    fi

    # ensure node v20 is in use
    echo "Preparing node..."
    pnpm env use --global 20 >/dev/null

    # ensure gib is up-to-date, then launch it
    echo "Loading gib..."
    pnpm -s dlx tiged -f toebeann/gib#node ~/.gib >/dev/null
    pnpm -C ~/.gib install >/dev/null
    pnpm -C ~/.gib launch
}
