#!/bin/bash
#
# This file is a shell script to ensure gib is up-to-date before launching it.
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

    set -euo pipefail # exit on err

    gib_dir=${GIB_INSTALL:-$HOME/.gib}
    bin_dir=${gib_dir}/bin
    gib=${bin_dir}/gib

    echo -ne "\033[2K⏳ Preparing to launch gib..."

    error() {
        echo -e "\r\033[2K❌" "$@" >&2
        exit 1
    }

    if [[ $# -gt 1 ]]; then
        error "Too many arguments, only 1 is allowed, which can be a specific tag of gib to install (e.g. \"v0.7.30\")"
    fi

    # only download gib binary if necessary, e.g. user has specified a tag, or version reported by gib is not latest
    if [[ ! -x "$gib" ]] ||
        [[ $# = 1 ]] ||
        ([[ $# = 0 ]] && ! "$gib" -s &>/dev/null); then

        command -v unzip >/dev/null || error "unzip is required to install gib"

        platform=$(uname -ms)
        case $platform in
        "Darwin x86_64")
            target=darwin-x64

            # check AVX2 support
            if [[ $(sysctl -a | grep machdep.cpu | grep AVX2) == '' ]]; then
                target="$target-baseline"
            fi
            ;;
        "Darwin arm64")
            target=darwin-aarch64
            ;;
        *)
            error "Target platform (${platform}) is not supported."
            ;;
        esac

        if [[ ! -d $bin_dir ]]; then
            mkdir -p "$bin_dir" || error "Failed to create install directory \"$bin_dir\""
        fi

        github_repo="https://github.com/toebeann/gib"

        if [[ $# = 0 ]]; then
            gib_uri=$github_repo/releases/latest/download/gib-$target.zip
        else
            gib_uri=$github_repo/releases/download/$1/gib-$target.zip
        fi

        echo -ne "\r\033[2K";

        curl -fL --progress-bar --output "$gib.zip" "$gib_uri" ||
        error "Failed to download gib from \"$gib_uri\""

        echo -ne "\033[A\033[2K⏳ Preparing to launch gib..."

        unzip -oqd "$bin_dir" "$gib.zip" || error "Failed to extract gib"

        mv "$gib-$target" "$gib" || error "Failed to move extracted gib to destination"

        chmod +x "$gib" || error "Failed to set permissions on gib executable"

        rm -r "$gib.zip"
    fi

    echo -ne "\r\033[2K"

    exec "$gib"
} # this ensures the entire script is downloaded #
