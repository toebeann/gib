#!/bin/sh
#
# This file is a shell script to ensure a user has pnpm & node installed,
# before using them to install and launching the gib CLI.
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
        exit 1
    fi

    # ensure node v20 is in use
    echo "Preparing node..."
    pnpm env use --global 20 >/dev/null

    # ensure gib is up-to-date, then launch it
    echo "Fetching gib..."

    if [ -n "${GIB_VERSION}" ]; then
        version="${GIB_VERSION}"
    else
        version="$(curl -s https://api.github.com/repos/toebeann/gib/releases/latest | pnpm -s dlx node-jq .tag_name | tr -d \" )"
    fi

    if [ -z "${version}" ]; then
        version="#${version}"
    else
        version=""
    fi

    # get latest release version from github
    pnpm -s dlx tiged -fm=tar toebeann/gib${version} ~/.gib
    echo "Fetching dependencies..."
    pnpm -C ~/.gib install >/dev/null
    echo "Launching gib..."
    pnpm -C ~/.gib launch
} # this ensures the entire script is downloaded #
