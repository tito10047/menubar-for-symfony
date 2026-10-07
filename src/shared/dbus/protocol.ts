/**
 * The D-Bus contract between the GNOME Shell extension and the helper daemon.
 *
 * This file is the single source of truth for the protocol: both the daemon
 * (which exports the interface) and the extension (which proxies it) compile
 * this same module, so a change here cannot leave one side behind.
 */

export const BUS_NAME = 'com.github.tito10047.MenubarForSymfony';
export const OBJECT_PATH = '/com/github/tito10047/MenubarForSymfony';
export const INTERFACE_NAME = 'com.github.tito10047.MenubarForSymfony1';

/**
 * Incremented on every incompatible change to the interface below.
 * The extension refuses to talk to a daemon reporting a different value and
 * asks the user to update the helper instead of failing in obscure ways.
 */
export const API_VERSION = 1;

export const DaemonError = {
    CLI_NOT_FOUND: `${INTERFACE_NAME}.Error.CliNotFound`,
    COMMAND_FAILED: `${INTERFACE_NAME}.Error.CommandFailed`,
    INVALID_ARGUMENT: `${INTERFACE_NAME}.Error.InvalidArgument`,
    TERMINAL_NOT_FOUND: `${INTERFACE_NAME}.Error.TerminalNotFound`,
    UNKNOWN_ACTION: `${INTERFACE_NAME}.Error.UnknownAction`,
} as const;

export const INTERFACE_XML = `
<node>
  <interface name="${INTERFACE_NAME}">

    <!--
      Lifecycle. The daemon only polls the Symfony CLI while at least one client
      is subscribed, and exits once it has been idle with no subscribers. The
      extension subscribes in enable() and unsubscribes in disable().
    -->
    <method name="Subscribe">
      <arg type="a{sv}" name="options" direction="in"/>
    </method>
    <method name="Unsubscribe"/>
    <method name="UpdateOptions">
      <arg type="a{sv}" name="options" direction="in"/>
    </method>

    <!-- Servers -->
    <method name="ListServers">
      <arg type="aa{sv}" name="servers" direction="out"/>
    </method>
    <method name="StartServer">
      <arg type="s" name="directory" direction="in"/>
    </method>
    <method name="StopServer">
      <arg type="s" name="directory" direction="in"/>
    </method>
    <method name="OpenServerLog">
      <arg type="s" name="directory" direction="in"/>
    </method>

    <!-- PHP. Each entry carries both the version and its inspected state. -->
    <method name="ListPhpVersions">
      <arg type="aa{sv}" name="versions" direction="out"/>
    </method>

    <!-- Proxy -->
    <method name="GetProxyStatus">
      <arg type="b" name="isRunning" direction="out"/>
      <arg type="aa{sv}" name="proxies" direction="out"/>
    </method>
    <method name="StartProxy"/>
    <method name="StopProxy"/>
    <method name="GetProxyUrl">
      <arg type="s" name="url" direction="out"/>
    </method>
    <method name="DetachProxyDomain">
      <arg type="s" name="domain" direction="in"/>
    </method>

    <!-- User-defined actions from ~/.config/menubar-for-symfony/actions.json -->
    <method name="ListCustomActions">
      <arg type="aa{sv}" name="actions" direction="out"/>
    </method>
    <method name="RunCustomAction">
      <arg type="s" name="id" direction="in"/>
      <arg type="s" name="directory" direction="in"/>
    </method>

    <signal name="ServersChanged">
      <arg type="aa{sv}" name="servers"/>
    </signal>
    <signal name="ProxyChanged">
      <arg type="b" name="isRunning"/>
      <arg type="aa{sv}" name="proxies"/>
    </signal>
    <signal name="PhpVersionsChanged">
      <arg type="aa{sv}" name="versions"/>
    </signal>

    <property name="ApiVersion" type="u" access="read"/>
    <property name="CliAvailable" type="b" access="read"/>
    <property name="SymfonyVersion" type="s" access="read"/>
  </interface>
</node>`;
