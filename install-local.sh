#!/bin/bash
#
# Builds and installs both halves of the project for local testing.
#
# The project is two programs: the GNOME Shell extension, and the helper daemon
# that runs the Symfony CLI for it. Only the extension needs a session reload —
# the daemon can be swapped out while you are logged in, which is why
# --daemon-only exists and is the fast path while working on it.
#
# Usage:
#   ./install-local.sh                # check, build, install both, offer to reload
#   ./install-local.sh --daemon-only  # build and swap the helper, no reload needed
#   ./install-local.sh --skip-checks  # skip typecheck and unit tests
#   ./install-local.sh --yes          # reload the session without asking
#   ./install-local.sh --no-reload    # install only, never reload

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

BUS_NAME="com.github.tito10047.SymfonyMenubar"
DAEMON_ONLY=false
SKIP_CHECKS=false
ASSUME_YES=false
NO_RELOAD=false

for argument in "$@"; do
    case "$argument" in
        --daemon-only) DAEMON_ONLY=true ;;
        --skip-checks) SKIP_CHECKS=true ;;
        --yes|-y)      ASSUME_YES=true ;;
        --no-reload)   NO_RELOAD=true ;;
        --help|-h)     sed -n '2,20p' "${BASH_SOURCE[0]}" | sed 's/^# \?//'; exit 0 ;;
        *)             echo "Unknown option: $argument (try --help)" >&2; exit 2 ;;
    esac
done

step() { printf '\n\033[1m==> %s\033[0m\n' "$1"; }

# --- prerequisites --------------------------------------------------------
for tool in node npm gjs glib-compile-schemas gnome-extensions zip; do
    if ! command -v "$tool" >/dev/null; then
        echo "Error: '$tool' is required but was not found on PATH." >&2
        exit 1
    fi
done

if [ ! -d node_modules ]; then
    step "Installing npm dependencies"
    npm install
fi

# --- checks ---------------------------------------------------------------
if [ "$SKIP_CHECKS" = false ]; then
    step "Typechecking"
    npm run typecheck

    step "Running unit tests"
    npm test
fi

# --- build ----------------------------------------------------------------
step "Building"
if [ "$DAEMON_ONLY" = true ]; then
    npm run build daemon
else
    npm run build
    npm run compile-schemas
fi

# --- helper daemon --------------------------------------------------------
step "Installing the helper daemon"
./daemon/install.sh

# A daemon from an earlier build may still own the bus name. Handing the name
# over to the new build is cleaner than killing the old process.
if gdbus call --session --dest org.freedesktop.DBus --object-path /org/freedesktop/DBus \
        --method org.freedesktop.DBus.GetNameOwner "$BUS_NAME" >/dev/null 2>&1; then
    echo "Replacing the running helper with the new build..."
    setsid "$HOME/.local/bin/symfony-menubar-daemon" --replace >/dev/null 2>&1 &
    sleep 1
fi

if [ "$DAEMON_ONLY" = true ]; then
    step "Done"
    echo "The helper has been replaced. No session reload is needed —"
    echo "close and reopen the menu to see the new behaviour."
    exit 0
fi

# --- extension ------------------------------------------------------------
step "Installing the extension"
UUID=$(grep -Po '"uuid": "\K[^"]*' metadata.json)

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

cp dist/extension/extension.js metadata.json stylesheet.css "$TMP_DIR/"
cp -r schemas "$TMP_DIR/"

ZIP="$TMP_DIR/$UUID.zip"
(cd "$TMP_DIR" && zip -qr "$ZIP" . -x "*.zip")

# Installing through gnome-extensions is what makes Wayland drop its cache.
gnome-extensions install --force "$ZIP"
echo "Installed $UUID"

if ! gnome-extensions list --enabled | grep -qx "$UUID"; then
    gnome-extensions enable "$UUID"
    echo "Enabled $UUID"
fi

# --- reload ---------------------------------------------------------------
if [ "$NO_RELOAD" = true ]; then
    step "Done"
    echo "Reload GNOME Shell yourself to pick up the new extension code."
    exit 0
fi

step "Reloading GNOME Shell"
if [ "${XDG_SESSION_TYPE:-}" = "x11" ]; then
    echo "You are on X11: press Alt+F2, type 'r' and press Enter."
    echo "No logout is needed."
    exit 0
fi

echo "You are on Wayland, where GNOME Shell cannot reload extension code without"
echo "restarting the session. Everything is installed and will be active after you"
echo "log back in."
echo

if [ "$ASSUME_YES" = false ]; then
    read -rp "Log out now? [y/N] " answer
    case "$answer" in
        [yY]|[yY][eE][sS]) ;;
        *) echo "Left your session alone. Log out when you are ready."; exit 0 ;;
    esac
fi

if command -v notify-send >/dev/null; then
    notify-send "Menubar for Symfony" "Installed. Logging out now." --icon=dialog-warning
fi
sleep 1
gnome-session-quit --logout --no-prompt
