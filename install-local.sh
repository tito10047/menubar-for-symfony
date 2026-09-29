#!/bin/bash
#
# Builds and installs the extension for local testing.
#
# The extension needs the helper daemon, which lives in its own repository:
#   https://github.com/tito10047/symfony-menubar-daemon
#
# If that repository is checked out next to this one, this script builds and
# installs it too. Only the extension needs a session reload — the helper can be
# swapped while you are logged in, which is what --helper-only is for.
#
# Usage:
#   ./install-local.sh                 # check, build, install both, offer to reload
#   ./install-local.sh --helper-only   # rebuild and swap the helper, no reload needed
#   ./install-local.sh --skip-helper   # extension only, leave the helper alone
#   ./install-local.sh --skip-checks   # skip typecheck and unit tests
#   ./install-local.sh --yes           # reload the session without asking
#   ./install-local.sh --no-reload     # install only, never reload
#
# Point HELPER_REPO at the helper checkout if it is not ../symfony-menubar-daemon.

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

BUS_NAME="com.github.tito10047.SymfonyMenubar"
HELPER_REPO="${HELPER_REPO:-../symfony-menubar-daemon}"

HELPER_ONLY=false
SKIP_HELPER=false
SKIP_CHECKS=false
ASSUME_YES=false
NO_RELOAD=false

for argument in "$@"; do
    case "$argument" in
        --helper-only) HELPER_ONLY=true ;;
        --skip-helper) SKIP_HELPER=true ;;
        --skip-checks) SKIP_CHECKS=true ;;
        --yes|-y)      ASSUME_YES=true ;;
        --no-reload)   NO_RELOAD=true ;;
        --help|-h)     sed -n '2,21p' "${BASH_SOURCE[0]}" | sed 's/^# \?//'; exit 0 ;;
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

# --- helper daemon --------------------------------------------------------
install_helper() {
    if [ ! -d "$HELPER_REPO" ]; then
        echo "The helper checkout was not found at $HELPER_REPO."
        echo "Clone it, or install a release tarball by hand:"
        echo "  git clone https://github.com/tito10047/symfony-menubar-daemon $HELPER_REPO"
        return 1
    fi

    (
        cd "$HELPER_REPO"
        [ -d node_modules ] || npm install
        npm run build
        ./install.sh
    )

    # A helper from an earlier build may still own the bus name. Handing the name
    # over to the new build is cleaner than killing the old process.
    if gdbus call --session --dest org.freedesktop.DBus --object-path /org/freedesktop/DBus \
            --method org.freedesktop.DBus.GetNameOwner "$BUS_NAME" >/dev/null 2>&1; then
        echo "Replacing the running helper with the new build..."
        setsid "$HOME/.local/bin/symfony-menubar-daemon" --replace >/dev/null 2>&1 &
        sleep 1
    fi
}

if [ "$HELPER_ONLY" = true ]; then
    step "Installing the helper daemon"
    install_helper
    step "Done"
    echo "The helper has been replaced. No session reload is needed —"
    echo "close and reopen the menu to see the new behaviour."
    exit 0
fi

# --- checks ---------------------------------------------------------------
if [ ! -d node_modules ]; then
    step "Installing npm dependencies"
    npm install
fi

if [ "$SKIP_CHECKS" = false ]; then
    step "Typechecking"
    npm run typecheck

    step "Running unit tests"
    npm test
fi

# --- build ----------------------------------------------------------------
step "Building the extension"
npm run build
npm run compile-schemas

if [ "$SKIP_HELPER" = false ]; then
    step "Installing the helper daemon"
    install_helper || echo "Continuing without the helper; the menu will say it is missing."
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
