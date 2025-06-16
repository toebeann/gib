#!/bin/bash
#
# This file is a shell script to ensure a user has all of the prerequisite
# dependencies of gib installed before launching it.
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

    gib_version=v0.7.15
    bun_version=1.2.16
    gib_dir=${GIB_INSTALL:-$HOME/.gib}

    while getopts :v: arg; do
        case $arg in
        v) gib_version=$OPTARG ;;
        esac
    done

    echo -ne "\033[K  ⏳ Preparing to launch gib..."

    bun_dir=${gib_dir}/env/bun
    bun=${bun_dir}/bin/bun

    # ensure bun is installed and version is in sync
    if ! command -v $bun >/dev/null; || [ $( $bun -v ) != $bun_version ] then
        (
            export BUN_INSTALL=$bun_dir
            export SHELL=""
            curl -fsSL https://bun.sh/install | bash -s bun-v$bun_version &>/dev/null
        )

        # check for bun command and let user know if not found
        if ! command -v $bun >/dev/null; then
            echo -e "\r\033[K  ❌ Installing bun failed"
            exit 1
        fi
    fi

    echo -ne "\r\033[2K"

    $bun x --bun github:toebeann/gib#${GIB_VERSION:-$gib_version} -- $@
} # this ensures the entire script is downloaded #
