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
    set -e # exit on err

    echo -ne "\r\033[K  ⏳ Preparing to launch gib..."

    # ensure bun is installed
    if ! command -v bun >/dev/null; then
        curl -fsSL https://bun.sh/install | bash &>/dev/null

        # check for bun command and let user know if not found
        if ! command -v bun >/dev/null; then
            echo -e "\r\033[K  ❌ Installing bun failed"
            echo "Bun not found in PATH!"
            echo "Please reload your terminal and run this script again."
            exit 1
        fi
    fi

    echo -ne "\r\033[2K"

    if [ -n "${GIB_CLEAR_CACHE}" ] && [ ${GIB_CLEAR_CACHE} -eq 1 &>/dev/null ]; then
        if ! bun pm cache rm -g &>/dev/null; then
            bun i noop -g &>/dev/null
            bun rm noop -g &>/dev/null
            bun pm cache rm -g &>/dev/null
        fi
    fi

    if [ -n "${GIB_VERSION}" ]; then
        bun x --bun toebeann/gib\#${GIB_VERSION}
    else
        bun x --bun toebeann/gib
    fi
} # this ensures the entire script is downloaded #
