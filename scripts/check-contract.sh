#!/bin/bash
#
# Reports drift in the shared D-Bus contract.
#
# src/shared/ is mirrored between this repository and the helper daemon's. Both
# sides compile the same protocol, wire shapes and marshalling, so the two copies
# must stay byte-identical — a silent divergence would break the bus at runtime
# rather than at build time.
#
# Usage: npm run check-contract [path-to-menubar-for-symfony-daemon]
#        defaults to ../menubar-for-symfony-daemon

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OTHER="${1:-$HERE/../menubar-for-symfony-daemon}"

MINE="$HERE/src/shared"
THEIRS="$OTHER/src/shared"

if [ ! -d "$THEIRS" ]; then
    echo "The helper daemon checkout was not found at $OTHER." >&2
    echo "Clone it next to this repository, or pass its path:" >&2
    echo "  git clone https://github.com/tito10047/menubar-for-symfony-daemon" >&2
    exit 1
fi

if diff -ru "$MINE" "$THEIRS"; then
    echo "src/shared is identical in both repositories."
    exit 0
fi

echo >&2
echo "src/shared has drifted. Copy the intended version across, and bump" >&2
echo "API_VERSION in src/shared/dbus/protocol.ts if the change is incompatible." >&2
exit 1
