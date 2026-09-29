#!/bin/bash
#
# Produces the two release artifacts:
#
#   /tmp/<uuid>.zip                              upload to extensions.gnome.org
#   /tmp/symfony-menubar-daemon-<version>.tar.gz attach to the GitHub release
#
# See publish.md for the full release procedure.

set -euo pipefail

npm run typecheck
npm test
npm run build

UUID=$(grep -Po '"uuid": "\K[^"]*' metadata.json)
VERSION=$(grep -Po '"version-name": "\K[^"]*' metadata.json)

# --- extension ZIP --------------------------------------------------------
EXT_DIR="/tmp/ego-build"
ZIP="/tmp/${UUID}.zip"

rm -rf "$EXT_DIR" && mkdir -p "$EXT_DIR"

cp dist/extension/extension.js "$EXT_DIR/"
cp metadata.json stylesheet.css "$EXT_DIR/"
cp -r schemas "$EXT_DIR/"

# GNOME 45+ compiles schemas itself — do not ship gschemas.compiled
rm -f "$EXT_DIR/schemas/gschemas.compiled"

rm -f "$ZIP"
(cd "$EXT_DIR" && zip -qr "$ZIP" . -x "*.DS_Store")

# --- helper tarball -------------------------------------------------------
DAEMON_NAME="symfony-menubar-daemon-${VERSION}"
DAEMON_DIR="/tmp/${DAEMON_NAME}"
TARBALL="/tmp/${DAEMON_NAME}.tar.gz"

rm -rf "$DAEMON_DIR" && mkdir -p "$DAEMON_DIR/dist/daemon"

cp dist/daemon/symfony-menubar-daemon.js "$DAEMON_DIR/dist/daemon/"
mkdir -p "$DAEMON_DIR/daemon"
cp daemon/install.sh daemon/uninstall.sh "$DAEMON_DIR/daemon/"
cp LICENSE "$DAEMON_DIR/"

rm -f "$TARBALL"
tar -czf "$TARBALL" -C /tmp "$DAEMON_NAME"

echo "Extension ZIP: $ZIP"
unzip -l "$ZIP" | sed 's/^/  /'
echo "Helper tarball: $TARBALL"
tar -tzf "$TARBALL" | sed 's/^/  /'
