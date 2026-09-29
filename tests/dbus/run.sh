#!/bin/bash
#
# End-to-end test of the daemon's D-Bus surface.
#
# Runs the bundled daemon on a private session bus and drives it with gdbus, so
# it covers what Jest cannot: the exported interface, variant marshalling in both
# directions, error mapping, signal delivery and the service file installer.
#
# Usage: npm run test:dbus

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DAEMON="$ROOT/dist/daemon/symfony-menubar-daemon.js"
BUS_NAME="com.github.tito10047.SymfonyMenubar"
OBJECT_PATH="/com/github/tito10047/SymfonyMenubar"
IFACE="com.github.tito10047.SymfonyMenubar1"

PASSED=0
FAILED=0

pass() { PASSED=$((PASSED + 1)); printf '  \033[32mok\033[0m   %s\n' "$1"; }
fail() {
    FAILED=$((FAILED + 1))
    printf '  \033[31mFAIL\033[0m %s\n' "$1"
    [ $# -gt 1 ] && printf '       %s\n' "$2"
}

assert_contains() {
    local label="$1" haystack="$2" needle="$3"
    if [[ "$haystack" == *"$needle"* ]]; then
        pass "$label"
    else
        fail "$label" "expected to contain '$needle', got: ${haystack:0:400}"
    fi
}

assert_equals() {
    local label="$1" actual="$2" expected="$3"
    if [[ "$actual" == "$expected" ]]; then
        pass "$label"
    else
        fail "$label" "expected '$expected', got '$actual'"
    fi
}

call() { gdbus call --session --dest "$BUS_NAME" --object-path "$OBJECT_PATH" --method "$IFACE.$1" "${@:2}" 2>&1; }
property() {
    gdbus call --session --dest "$BUS_NAME" --object-path "$OBJECT_PATH" \
        --method org.freedesktop.DBus.Properties.Get "$IFACE" "$1" 2>&1
}

# ---------------------------------------------------------------------------
# Outer invocation: prepare an isolated XDG environment, then re-enter under a
# private session bus so the developer's real bus is never touched.
# ---------------------------------------------------------------------------
if [ "${1:-}" != "--inner" ]; then
    if [ ! -f "$DAEMON" ]; then
        echo "Daemon bundle not found at $DAEMON — run 'npm run build' first." >&2
        exit 1
    fi
    if ! command -v dbus-run-session >/dev/null; then
        echo "dbus-run-session is required (package 'dbus-daemon' or 'dbus-x11')." >&2
        exit 1
    fi

    WORK_DIR="$(mktemp -d)"
    trap 'rm -rf "$WORK_DIR"' EXIT

    mkdir -p "$WORK_DIR/config/symfony-menubar" "$WORK_DIR/data" "$WORK_DIR/project"

    # Two usable actions plus three that must be rejected with a logged reason.
    cat > "$WORK_DIR/config/symfony-menubar/actions.json" <<'JSON'
[
  { "name": "Editor", "command": "true {path}", "icon": "document-open-symbolic", "inline": true },
  { "name": "Deploy", "command": "true deploy" },
  { "name": "Editor", "command": "true duplicate-name" },
  { "name": "No command" },
  "not an object"
]
JSON

    export XDG_CONFIG_HOME="$WORK_DIR/config"
    export XDG_DATA_HOME="$WORK_DIR/data"
    export WORK_DIR

    exec dbus-run-session -- "$0" --inner
fi

# ---------------------------------------------------------------------------
# Inner invocation: a private session bus is now available.
# ---------------------------------------------------------------------------
echo "Running D-Bus end-to-end tests"

LOG="$WORK_DIR/daemon.log"
gjs -m "$DAEMON" --verbose >"$LOG" 2>&1 &
DAEMON_PID=$!
trap 'kill "$DAEMON_PID" 2>/dev/null' EXIT

for _ in $(seq 50); do
    gdbus introspect --session --dest "$BUS_NAME" --object-path "$OBJECT_PATH" >/dev/null 2>&1 && break
    sleep 0.1
done

if ! kill -0 "$DAEMON_PID" 2>/dev/null; then
    echo "Daemon exited during startup:" >&2
    cat "$LOG" >&2
    exit 1
fi

# --- interface ------------------------------------------------------------
INTROSPECTION="$(gdbus introspect --session --dest "$BUS_NAME" --object-path "$OBJECT_PATH" 2>&1)"
assert_contains "interface is exported" "$INTROSPECTION" "interface $IFACE"
assert_contains "ServersChanged signal is declared" "$INTROSPECTION" "ServersChanged"

# --- properties -----------------------------------------------------------
assert_equals "ApiVersion is 1" "$(property ApiVersion)" "(<uint32 1>,)"
assert_equals "CliAvailable is true" "$(property CliAvailable)" "(<true>,)"

# --- custom actions -------------------------------------------------------
ACTIONS="$(call ListCustomActions)"
assert_contains "valid action is listed" "$ACTIONS" "'name': <'Editor'>"
assert_contains "second valid action is listed" "$ACTIONS" "'name': <'Deploy'>"
assert_contains "action id is exposed" "$ACTIONS" "'id': <'Editor'>"
assert_equals "exactly two actions are listed" "$(grep -o "'id':" <<<"$ACTIONS" | wc -l)" "2"
if [[ "$ACTIONS" == *"command"* ]]; then
    fail "the shell command never reaches the client" "ListCustomActions leaked a command field"
else
    pass "the shell command never reaches the client"
fi

assert_contains "duplicate action name is reported" "$(cat "$LOG")" "duplicate name 'Editor'"
assert_contains "action without a command is reported" "$(cat "$LOG")" "'command' is required"
assert_contains "non-object entry is reported" "$(cat "$LOG")" "expected a JSON object"

# --- error mapping --------------------------------------------------------
assert_contains "unknown action is rejected" "$(call RunCustomAction "nope" "$WORK_DIR/project")" \
    "$IFACE.Error.UnknownAction"
assert_contains "empty directory is rejected" "$(call StartServer "")" \
    "$IFACE.Error.InvalidArgument"
assert_contains "malformed options are rejected" "$(call Subscribe "{'debugLogging': <true>}")" \
    "$IFACE.Error.InvalidArgument"

# --- lifecycle and live data ---------------------------------------------
gdbus monitor --session --dest "$BUS_NAME" >"$WORK_DIR/monitor.log" 2>&1 &
MONITOR_PID=$!
sleep 0.5

OPTIONS="{'pollIntervalSeconds': <uint32 1>, 'debugLogging': <true>, 'terminalCommand': <''>, 'symfonyPath': <''>}"
assert_equals "Subscribe succeeds" "$(call Subscribe "$OPTIONS")" "()"

# A machine with no registered projects legitimately answers with an empty
# array, so only the reply type is asserted here.
SERVERS="$(call ListServers)"
if [[ "$SERVERS" == *"Error"* ]] || [[ "$SERVERS" != *"]"* ]]; then
    fail "ListServers returns an array of dictionaries" "got: ${SERVERS:0:400}"
else
    pass "ListServers returns an array of dictionaries"
fi

PROXY="$(call GetProxyStatus)"
assert_contains "GetProxyStatus returns a boolean and an array" "$PROXY" "["

PHP="$(call ListPhpVersions)"
assert_contains "ListPhpVersions reports a version" "$PHP" "'version':"
assert_contains "ListPhpVersions reports extension state" "$PHP" "'xdebug':"

sleep 2
kill "$MONITOR_PID" 2>/dev/null
assert_contains "a state signal was broadcast" "$(cat "$WORK_DIR/monitor.log")" "$IFACE."

VERSION_PROPERTY="$(property SymfonyVersion)"
if [[ "$VERSION_PROPERTY" == "(<''>,)" ]]; then
    fail "SymfonyVersion is filled in after Subscribe" "still empty"
else
    pass "SymfonyVersion is filled in after Subscribe"
fi

assert_equals "UpdateOptions succeeds" "$(call UpdateOptions "$OPTIONS")" "()"
assert_equals "Unsubscribe succeeds" "$(call Unsubscribe)" "()"
assert_contains "polling stops without subscribers" "$(cat "$LOG")" "Stopped status polling"

kill "$DAEMON_PID" 2>/dev/null
wait "$DAEMON_PID" 2>/dev/null

# --- service file installer ----------------------------------------------
SERVICE_FILE="$XDG_DATA_HOME/dbus-1/services/$BUS_NAME.service"
gjs -m "$DAEMON" --install-service >/dev/null 2>&1
if [ -f "$SERVICE_FILE" ]; then
    pass "--install-service writes the activation file"
    assert_contains "activation file names the bus" "$(cat "$SERVICE_FILE")" "Name=$BUS_NAME"
    assert_contains "activation file execs gjs" "$(cat "$SERVICE_FILE")" "Exec="
else
    fail "--install-service writes the activation file" "$SERVICE_FILE is missing"
fi

gjs -m "$DAEMON" --uninstall-service >/dev/null 2>&1
if [ -f "$SERVICE_FILE" ]; then
    fail "--uninstall-service removes the activation file" "$SERVICE_FILE still exists"
else
    pass "--uninstall-service removes the activation file"
fi

echo
echo "$PASSED passed, $FAILED failed"
[ "$FAILED" -eq 0 ]
