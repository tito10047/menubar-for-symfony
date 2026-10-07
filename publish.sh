#!/bin/bash
#
# Produces the extension ZIP for extensions.gnome.org.
#
# The helper daemon is released from its own repository:
# https://github.com/tito10047/menubar-for-symfony-daemon
# Both must be published together — the extension refuses to talk to a helper
# reporting a different API_VERSION. See publish.md.

set -euo pipefail

npm run typecheck
npm test
npm run build

UUID=$(grep -Po '"uuid": "\K[^"]*' metadata.json)
VERSION=$(grep -Po '"version-name": "\K[^"]*' metadata.json)

BUILD_DIR="/tmp/ego-build"
ZIP="/tmp/${UUID}.zip"

rm -rf "$BUILD_DIR" && mkdir -p "$BUILD_DIR"

cp dist/extension/extension.js "$BUILD_DIR/"
cp metadata.json stylesheet.css "$BUILD_DIR/"
cp -r schemas "$BUILD_DIR/"

# GNOME 45+ compiles schemas itself — do not ship gschemas.compiled
rm -f "$BUILD_DIR/schemas/gschemas.compiled"

rm -f "$ZIP"
(cd "$BUILD_DIR" && zip -qr "$ZIP" . -x "*.DS_Store")

# The reviewers asked for this property; assert it rather than trusting it.
if grep -nE 'Gio\.Subprocess|GLib\.spawn|timeout_add' dist/extension/extension.js; then
    echo "Error: the extension bundle must not spawn processes or own timers." >&2
    exit 1
fi

echo "Extension ZIP for version $VERSION: $ZIP"
unzip -l "$ZIP" | sed 's/^/  /'
echo
echo "Remember to release a matching menubar-for-symfony-daemon:"
echo "  https://github.com/tito10047/menubar-for-symfony-daemon/releases"
