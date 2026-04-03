#!/bin/bash

# 1. Build project
echo "Building project..."
npm run build

# 2. Get UUID from metadata.json
UUID=$(grep -Po '"uuid": "\K[^"]*' metadata.json)

if [ -z "$UUID" ]; then
    echo "Error: Could not find UUID in metadata.json"
    exit 1
fi

# 3. Define install directory
INSTALL_DIR="$HOME/.local/share/gnome-shell/extensions/$UUID"

# 4. Cleanup and recreate install directory
echo "Installing to: $INSTALL_DIR"
rm -rf "$INSTALL_DIR"
mkdir -p "$INSTALL_DIR"

# 5. Copy files
if [ -f "dist/extension.js" ]; then
    cp dist/extension.js "$INSTALL_DIR/"
else
    echo "Error: dist/extension.js not found. Build failed?"
    exit 1
fi

cp metadata.json "$INSTALL_DIR/"
cp stylesheet.css "$INSTALL_DIR/"
cp -r schemas "$INSTALL_DIR/"

# 6. Compile schemas
echo "Compiling schemas..."
glib-compile-schemas "$INSTALL_DIR/schemas/"

# 7. Print instructions
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "\n${GREEN}Installation successful!${NC}"
echo -e "To enable the extension, run:"
echo -e "  ${BLUE}gnome-extensions enable $UUID${NC}"
echo -e "\nTo see logs, run:"
echo -e "  ${BLUE}journalctl -f -o cat /usr/bin/gnome-shell | grep SymfonyMenubar${NC}"
