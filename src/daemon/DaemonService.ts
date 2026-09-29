import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import { API_VERSION, DaemonError } from '../shared/dbus/protocol.js';
import { packDicts, unpackDict } from '../shared/dbus/variant.js';
import {
    CUSTOM_ACTION_SPEC,
    OPTIONS_SPEC,
    OptionsWire,
    PHP_VERSION_SPEC,
    PROXY_SPEC,
    SERVER_SPEC,
    ServerWire,
    toCustomActionWire,
    toProxyWire,
    toServerWire,
} from '../shared/dbus/wire.js';
import { SymfonyServer } from '../shared/dto/SymfonyServer.js';
import { ProxyStatus } from '../shared/dto/ProxyStatus.js';
import { VersionResponse } from '../shared/dto/VersionResponse.js';
import { ConsoleLogger } from '../shared/logging/ConsoleLogger.js';
import { formatError } from '../shared/errors.js';

import { SymfonyCliManager } from './core/SymfonyCliManager.js';
import { SymfonyEnvironment } from './SymfonyEnvironment.js';
import { PhpVersionInventory } from './PhpVersionInventory.js';
import { CustomActionsRepository } from './services/CustomActionsRepository.js';
import { ActionRunner } from './ActionRunner.js';
import { TerminalLauncher } from './TerminalLauncher.js';
import { ProxySnapshot, StateListener, StateSource, StateWatcher } from './StateWatcher.js';
import { DaemonFailure } from './DaemonFailure.js';

/** How long the daemon stays alive with no subscriber and no incoming call. */
const IDLE_EXIT_SECONDS = 300;

const DEFAULT_OPTIONS: OptionsWire = {
    pollIntervalSeconds: 5,
    debugLogging: false,
    terminalCommand: '',
    symfonyPath: '',
};

export interface DaemonServiceDependencies {
    manager: SymfonyCliManager;
    environment: SymfonyEnvironment;
    phpVersions: PhpVersionInventory;
    actions: CustomActionsRepository;
    actionRunner: ActionRunner;
    terminal: TerminalLauncher;
    logger: ConsoleLogger;
    /** Called when the daemon has been idle long enough to exit. */
    onIdle: () => void;
}

/**
 * The object exported on the session bus.
 *
 * Every method is a thin shell: validate the arguments, delegate to a command or
 * service, marshal the result. All failures are logged here and returned to the
 * caller as a D-Bus error — nothing is swallowed, and the extension never has to
 * guess why something did not happen.
 */
export class DaemonService implements StateListener, StateSource {
    private readonly _watcher: StateWatcher;
    /** Bus name of each subscriber, mapped to the watcher id that detects its exit. */
    private readonly _subscribers = new Map<string, number>();
    private _options: OptionsWire = DEFAULT_OPTIONS;
    private _exported: Gio.DBusExportedObject | null = null;
    private _connection: Gio.DBusConnection | null = null;
    private _idleTimerId: number | null = null;

    constructor(private readonly deps: DaemonServiceDependencies) {
        this._watcher = new StateWatcher(this, this, deps.logger, DEFAULT_OPTIONS.pollIntervalSeconds);
    }

    // ---- Lifecycle -------------------------------------------------------

    /** Called once the object has been exported, so signals can be emitted. */
    attach(connection: Gio.DBusConnection, exported: Gio.DBusExportedObject): void {
        this._connection = connection;
        this._exported = exported;
        this._armIdleTimer();
    }

    /** Releases every resource the service holds. Safe to call more than once. */
    shutdown(): void {
        this._watcher.stop();
        this._cancelIdleTimer();

        for (const [sender, watcherId] of this._subscribers) {
            Gio.bus_unwatch_name(watcherId);
            this.deps.logger.debug(`Stopped watching subscriber ${sender}`);
        }
        this._subscribers.clear();
    }

    // ---- Properties ------------------------------------------------------

    get ApiVersion(): number {
        return API_VERSION;
    }

    get CliAvailable(): boolean {
        return this.deps.environment.available;
    }

    get SymfonyVersion(): string {
        return this.deps.environment.version;
    }

    // ---- Lifecycle methods ----------------------------------------------

    SubscribeAsync(params: unknown, invocation: Gio.DBusMethodInvocation): void {
        this._handle(invocation, null, async () => {
            const options = this._readOptions(params, 'Subscribe');
            const sender = invocation.get_sender();
            if (sender === null) {
                throw DaemonFailure.invalidArgument('Subscribe requires a sender bus name');
            }

            await this._applyOptions(options);
            this._addSubscriber(sender);
            this._watcher.start();
            return [];
        });
    }

    UnsubscribeAsync(_params: unknown, invocation: Gio.DBusMethodInvocation): void {
        this._handle(invocation, null, async () => {
            const sender = invocation.get_sender();
            if (sender !== null) {
                this._removeSubscriber(sender);
            }
            return [];
        });
    }

    UpdateOptionsAsync(params: unknown, invocation: Gio.DBusMethodInvocation): void {
        this._handle(invocation, null, async () => {
            await this._applyOptions(this._readOptions(params, 'UpdateOptions'));
            return [];
        });
    }

    // ---- Servers ---------------------------------------------------------

    ListServersAsync(_params: unknown, invocation: Gio.DBusMethodInvocation): void {
        this._handle(invocation, '(aa{sv})', async () => [packDicts(SERVER_SPEC, await this.listServers())]);
    }

    StartServerAsync(params: unknown, invocation: Gio.DBusMethodInvocation): void {
        this._handle(invocation, null, async () => {
            const directory = stringArgument(params, 0, 'directory');
            await this.deps.manager.runCommand<boolean>('server:start', [directory]);
            this._watcher.requestFastPolling();
            return [];
        });
    }

    StopServerAsync(params: unknown, invocation: Gio.DBusMethodInvocation): void {
        this._handle(invocation, null, async () => {
            const directory = stringArgument(params, 0, 'directory');
            await this.deps.manager.runCommand<boolean>('server:stop', [directory]);
            this._watcher.requestFastPolling();
            return [];
        });
    }

    OpenServerLogAsync(params: unknown, invocation: Gio.DBusMethodInvocation): void {
        this._handle(invocation, null, async () => {
            const directory = stringArgument(params, 0, 'directory');
            const symfony = this.deps.environment.requireBinaryPath();
            this.deps.terminal.launch(
                [symfony, 'server:log', `--dir=${directory}`],
                this._options.terminalCommand,
            );
            return [];
        });
    }

    // ---- PHP -------------------------------------------------------------

    ListPhpVersionsAsync(_params: unknown, invocation: Gio.DBusMethodInvocation): void {
        this._handle(invocation, '(aa{sv})', async () => {
            const versions = await this.deps.phpVersions.list();
            return [packDicts(PHP_VERSION_SPEC, versions)];
        });
    }

    // ---- Proxy -----------------------------------------------------------

    GetProxyStatusAsync(_params: unknown, invocation: Gio.DBusMethodInvocation): void {
        this._handle(invocation, '(baa{sv})', async () => {
            const snapshot = await this.getProxyStatus();
            return [snapshot.isRunning, packDicts(PROXY_SPEC, snapshot.proxies)];
        });
    }

    StartProxyAsync(_params: unknown, invocation: Gio.DBusMethodInvocation): void {
        this._handle(invocation, null, async () => {
            await this.deps.manager.runCommand<boolean>('proxy:start');
            this._watcher.requestFastPolling();
            return [];
        });
    }

    StopProxyAsync(_params: unknown, invocation: Gio.DBusMethodInvocation): void {
        this._handle(invocation, null, async () => {
            await this.deps.manager.runCommand<boolean>('proxy:stop');
            this._watcher.requestFastPolling();
            return [];
        });
    }

    GetProxyUrlAsync(_params: unknown, invocation: Gio.DBusMethodInvocation): void {
        this._handle(invocation, '(s)', async () => [
            await this.deps.manager.runCommand<string>('proxy:url'),
        ]);
    }

    DetachProxyDomainAsync(params: unknown, invocation: Gio.DBusMethodInvocation): void {
        this._handle(invocation, null, async () => {
            const domain = stringArgument(params, 0, 'domain');
            await this.deps.manager.runCommand<boolean>('proxy:domain:detach', [domain]);
            this._watcher.requestFastPolling();
            return [];
        });
    }

    // ---- Custom actions --------------------------------------------------

    ListCustomActionsAsync(_params: unknown, invocation: Gio.DBusMethodInvocation): void {
        this._handle(invocation, '(aa{sv})', async () => {
            const descriptors = this.deps.actions.list().map(toCustomActionWire);
            return [packDicts(CUSTOM_ACTION_SPEC, descriptors)];
        });
    }

    RunCustomActionAsync(params: unknown, invocation: Gio.DBusMethodInvocation): void {
        this._handle(invocation, null, async () => {
            const id = stringArgument(params, 0, 'id');
            const directory = stringArgument(params, 1, 'directory');

            const action = this.deps.actions.list().find(candidate => candidate.id === id);
            if (action === undefined) {
                throw DaemonFailure.unknownAction(`No custom action named '${id}' is defined`);
            }

            this.deps.actionRunner.run(action, directory);
            return [];
        });
    }

    // ---- StateSource -----------------------------------------------------

    async listServers(): Promise<ServerWire[]> {
        const servers = await this.deps.manager.runCommand<SymfonyServer[]>('server:list');
        return servers.map(toServerWire);
    }

    async getProxyStatus(): Promise<ProxySnapshot> {
        const status = await this.deps.manager.runCommand<ProxyStatus>('proxy:status');
        return { isRunning: status.isRunning, proxies: status.proxies.map(toProxyWire) };
    }

    // ---- StateListener ---------------------------------------------------

    onServersChanged(servers: ServerWire[]): void {
        this._emit('ServersChanged', '(aa{sv})', [packDicts(SERVER_SPEC, servers)]);
    }

    onProxyChanged(snapshot: ProxySnapshot): void {
        this._emit('ProxyChanged', '(baa{sv})', [
            snapshot.isRunning,
            packDicts(PROXY_SPEC, snapshot.proxies),
        ]);
    }

    // ---- Internals -------------------------------------------------------

    /**
     * Runs a method body, answers the caller and makes sure every failure is both
     * logged and reported.
     *
     * @param outSignature Signature of the reply tuple, or `null` for a method
     *                     without return values.
     */
    private _handle(
        invocation: Gio.DBusMethodInvocation,
        outSignature: string | null,
        body: () => Promise<unknown[]>,
    ): void {
        this._touch();

        body()
            .then(values => {
                invocation.return_value(outSignature === null ? null : new GLib.Variant(outSignature, values));
            })
            .catch((cause: unknown) => {
                const name = cause instanceof DaemonFailure ? cause.dbusErrorName : DaemonError.COMMAND_FAILED;
                const message = formatError(cause);
                this.deps.logger.error(`${invocation.get_method_name()} failed: ${message}`);
                invocation.return_dbus_error(name, message);
            });
    }

    private _emit(signal: string, signature: string, values: unknown[]): void {
        if (this._exported === null) {
            this.deps.logger.warn(`Cannot emit ${signal}: the object is not exported yet`);
            return;
        }
        this.deps.logger.debug(`Emitting ${signal}`);
        this._exported.emit_signal(signal, new GLib.Variant(signature, values));
    }

    private _readOptions(params: unknown, method: string): OptionsWire {
        if (!Array.isArray(params)) {
            throw DaemonFailure.invalidArgument(`${method} expects a single options argument`);
        }
        try {
            return unpackDict<OptionsWire>(OPTIONS_SPEC, params[0], `${method}(options)`);
        } catch (cause) {
            throw DaemonFailure.invalidArgument(formatError(cause));
        }
    }

    private async _applyOptions(options: OptionsWire): Promise<void> {
        const previous = this._options;
        this._options = options;

        this.deps.logger.setDebugLogging(options.debugLogging);
        this._watcher.setConfiguredInterval(options.pollIntervalSeconds);

        if (options.symfonyPath !== previous.symfonyPath || !this.deps.environment.available) {
            const wasAvailable = this.deps.environment.available;
            const available = this.deps.environment.locate(options.symfonyPath);
            if (available !== wasAvailable) {
                this._emitPropertyChanged('CliAvailable', new GLib.Variant('b', available));
            }
        }

        await this._refreshSymfonyVersion();
    }

    private async _refreshSymfonyVersion(): Promise<void> {
        if (!this.deps.environment.available || this.deps.environment.version !== '') {
            return;
        }

        try {
            const response = await this.deps.manager.runCommand<VersionResponse>('version');
            this.deps.environment.rememberVersion(response.version);
            this._emitPropertyChanged('SymfonyVersion', new GLib.Variant('s', response.version));
        } catch (cause) {
            // Not fatal: the version is cosmetic, everything else still works.
            this.deps.logger.warn(`Could not read the Symfony CLI version: ${formatError(cause)}`);
        }
    }

    private _emitPropertyChanged(name: string, value: GLib.Variant): void {
        if (this._exported === null) {
            return;
        }
        this._exported.emit_property_changed(name, value);
    }

    // ---- Subscribers and idle handling -----------------------------------

    private _addSubscriber(sender: string): void {
        if (this._subscribers.has(sender)) {
            this.deps.logger.debug(`Subscriber ${sender} renewed its subscription`);
            return;
        }

        if (this._connection === null) {
            throw new Error('DaemonService.attach() must run before a client may subscribe');
        }

        const watcherId = Gio.bus_watch_name_on_connection(
            this._connection,
            sender,
            Gio.BusNameWatcherFlags.NONE,
            null,
            // Fires when the client disappears without unsubscribing, which is
            // what happens when gnome-shell restarts or crashes.
            () => {
                this.deps.logger.info(`Subscriber ${sender} vanished`);
                this._removeSubscriber(sender);
            },
        );

        this._subscribers.set(sender, watcherId);
        this._cancelIdleTimer();
        this.deps.logger.info(`Subscriber ${sender} added (${this._subscribers.size} total)`);
    }

    private _removeSubscriber(sender: string): void {
        const watcherId = this._subscribers.get(sender);
        if (watcherId !== undefined) {
            Gio.bus_unwatch_name(watcherId);
            this._subscribers.delete(sender);
            this.deps.logger.info(`Subscriber ${sender} removed (${this._subscribers.size} left)`);
        }

        if (this._subscribers.size === 0) {
            this._watcher.stop();
            this._armIdleTimer();
        }
    }

    /** Keeps the daemon alive while it is being used. */
    private _touch(): void {
        if (this._subscribers.size === 0) {
            this._armIdleTimer();
        } else {
            this._cancelIdleTimer();
        }
    }

    private _armIdleTimer(): void {
        this._cancelIdleTimer();
        this._idleTimerId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, IDLE_EXIT_SECONDS, () => {
            this._idleTimerId = null;
            this.deps.logger.info(`Idle for ${IDLE_EXIT_SECONDS}s with no subscribers, exiting`);
            this.deps.onIdle();
            return GLib.SOURCE_REMOVE;
        });
    }

    private _cancelIdleTimer(): void {
        if (this._idleTimerId !== null) {
            GLib.Source.remove(this._idleTimerId);
            this._idleTimerId = null;
        }
    }
}

function stringArgument(params: unknown, index: number, name: string): string {
    if (!Array.isArray(params)) {
        throw DaemonFailure.invalidArgument(`Expected an argument list, got ${typeof params}`);
    }

    const value = params[index];
    if (typeof value !== 'string') {
        throw DaemonFailure.invalidArgument(`Argument '${name}' must be a string`);
    }
    if (value.trim() === '') {
        throw DaemonFailure.invalidArgument(`Argument '${name}' must not be empty`);
    }

    return value;
}
