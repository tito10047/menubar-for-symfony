#!/bin/bash
set -e

npm run build
npm run compile-schemas

UUID=$(grep -Po '"uuid": "\K[^"]*' metadata.json)
TMP_DIR="/tmp/ego-build"
ZIP="/tmp/${UUID}.zip"

rm -rf "$TMP_DIR" && mkdir -p "$TMP_DIR"

cp -r dist/. "$TMP_DIR/"
cp metadata.json stylesheet.css "$TMP_DIR/"
cp -r schemas "$TMP_DIR/"

# GNOME 45+ compiles schemas itself — do not ship gschemas.compiled
rm -f "$TMP_DIR/schemas/gschemas.compiled"

# Remove empty TypeScript interface/DTO stubs (compile to `export {};`)
grep -rl '^export {};$' "$TMP_DIR" | xargs rm -f

(cd "$TMP_DIR" && zip -r "$ZIP" . -x "*.DS_Store")

echo "$ZIP"
