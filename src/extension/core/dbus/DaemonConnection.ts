import Gio from 'gi://Gio';

import { API_VERSION, BUS_NAME, OBJECT_PATH } from '../../../shared/dbus/protocol.js';
import { packDict } from '../../../shared/dbus/variant.js';
import { OPTIONS_SPEC, OptionsWire } from '../../../shared/dbus/wire.js';
import { SymfonyServer } from '../../../shared/dto/SymfonyServer.js';
import { ProxyStatus } from '../../../shared/dto/ProxyStatus.js';
import { LoggerInterface } from '../../../shared/interfaces/LoggerInterface.js';
import { formatError } from '../../../shared/errors.js';
import { DaemonClient } from './DaemonClient.js';
import { DaemonClientInterface, InspectedPhpVersion } from './DaemonClientInterface.js';
import { MenubarForSymfonyProxy, MenubarForSymfonyProxyConstructor } from './MenubarForSymfonyProxy.js';

/** Why the extension can or cannot talk to the helper right now. */
export type DaemonAvailability =
    | { kind: 'available'; client: DaemonClientInterface; cliAvailable: boolean; symfonyVersion: string }
    | { kind: 'unavailable' }
    | { kind: 'incompatible'; daemonApiVersion: number }
    | { kind: 'failed'; message: string };

export interface DaemonConnectionCallbacks {
    onAvailabilityChanged(availability: DaemonAvailability): void;
    onServersChanged(servers: SymfonyServer[]): void;
    onProxyChanged(status: ProxyStatus): void;
    onPhpVersionsChanged(versions: InspectedPhpVersion[]): void;
    onCliAvailabilityChanged(available: boolean): void;
}

/**
 * Owns the connection to the helper daemon.
 *
 * Watching the bus name with `AUTO_START` is what starts the daemon: the bus
 * activates it on demand, so the extension never spawns a process itself. If no
 * activation file is installed the name simply never appears and the menu says
 * so — `retry()` exists for the case where the user installs the helper while
 * the extension is already enabled.
 *
 * Note that this class owns no timers. Everything is driven by bus name events,
 * proxy signals and explicit user action.
 */
export class DaemonConnection {
    private _nameWatcherId: number | null = null;
    private _proxy: MenubarForSymfonyProxy | null = null;
    private _cancellable: Gio.Cancellable | null = null;
    private _signalIds: number[] = [];
    private _propertiesSignalId: number | null = null;
    private _subscribed = false;

    constructor(
        private readonly logger: LoggerInterface,
        private readonly readOptions: () => OptionsWire,
        private readonly callbacks: DaemonConnectionCallbacks,
    ) {}

    start(): void {
        if (this._nameWatcherId !== null) {
            this.logger.debug('Daemon connection already started');
            return;
        }

        this.logger.info(`Watching for ${BUS_NAME}`);
        this._nameWatcherId = Gio.bus_watch_name(
            Gio.BusType.SESSION,
            BUS_NAME,
            // Asks the bus to activate the daemon if an activation file exists.
            Gio.BusNameWatcherFlags.AUTO_START,
            () => this._onNameAppeared(),
            () => this._onNameVanished(),
        );
    }

    /** Re-runs discovery, for when the helper is installed while we are running. */
    retry(): void {
        this.logger.info('Retrying to reach the helper daemon');
        this.stop();
        this.start();
    }

    stop(): void {
        this._unsubscribe();
        this._releaseProxy();

        if (this._nameWatcherId !== null) {
            Gio.bus_unwatch_name(this._nameWatcherId);
            this._nameWatcherId = null;
        }
    }

    /** Pushes changed settings to the daemon. Does nothing while disconnected. */
    updateOptions(): void {
        const proxy = this._proxy;
        if (proxy === null || !this._subscribed) {
            this.logger.debug('Not sending options: no subscription yet');
            return;
        }

        const logger = this.logger;
        proxy
            .UpdateOptionsAsync(packDict<OptionsWire>(OPTIONS_SPEC, this.readOptions()))
            .catch((cause: unknown) => logger.error(`UpdateOptions failed: ${formatError(cause)}`));
    }

    private _onNameAppeared(): void {
        this.logger.info(`${BUS_NAME} appeared on the session bus`);

        const cancellable = new Gio.Cancellable();
        this._cancellable = cancellable;

        MenubarForSymfonyProxyConstructor(
            Gio.DBus.session,
            BUS_NAME,
            OBJECT_PATH,
            (proxy, error) => {
                if (cancellable.is_cancelled()) {
                    this.logger.debug('Proxy creation completed after the extension was disabled; discarding it');
                    return;
                }
                if (proxy === null) {
                    const message = formatError(error);
                    this.logger.error(`Could not create the daemon proxy: ${message}`);
                    this.callbacks.onAvailabilityChanged({ kind: 'failed', message });
                    return;
                }
                this._adopt(proxy);
            },
            cancellable,
        );
    }

    private _onNameVanished(): void {
        this.logger.info(`${BUS_NAME} is not available`);
        this._subscribed = false;
        this._releaseProxy();
        this.callbacks.onAvailabilityChanged({ kind: 'unavailable' });
    }

    private _adopt(proxy: MenubarForSymfonyProxy): void {
        if (proxy.ApiVersion !== API_VERSION) {
            this.logger.error(
                `The helper daemon speaks API version ${proxy.ApiVersion}, this extension needs ${API_VERSION}.`,
            );
            this.callbacks.onAvailabilityChanged({
                kind: 'incompatible',
                daemonApiVersion: proxy.ApiVersion,
            });
            return;
        }

        this._proxy = proxy;
        this._connectSignals(proxy);

        proxy
            .SubscribeAsync(packDict<OptionsWire>(OPTIONS_SPEC, this.readOptions()))
            .then(() => {
                this._subscribed = true;
                this.logger.info('Subscribed to daemon state updates');
                this.callbacks.onAvailabilityChanged({
                    kind: 'available',
                    client: new DaemonClient(proxy),
                    cliAvailable: proxy.CliAvailable,
                    symfonyVersion: proxy.SymfonyVersion,
                });
            })
            .catch((cause: unknown) => {
                const message = formatError(cause);
                this.logger.error(`Subscribe failed: ${message}`);
                this.callbacks.onAvailabilityChanged({ kind: 'failed', message });
            });
    }

    private _connectSignals(proxy: MenubarForSymfonyProxy): void {
        this._signalIds.push(
            proxy.connectSignal('ServersChanged', (_proxy, _sender, args) => {
                this._deliver('ServersChanged', () =>
                    this.callbacks.onServersChanged(DaemonClient.decodeServers(args[0])),
                );
            }),
            proxy.connectSignal('ProxyChanged', (_proxy, _sender, args) => {
                this._deliver('ProxyChanged', () =>
                    this.callbacks.onProxyChanged(DaemonClient.decodeProxyStatus(args[0], args[1])),
                );
            }),
            proxy.connectSignal('PhpVersionsChanged', (_proxy, _sender, args) => {
                this._deliver('PhpVersionsChanged', () =>
                    this.callbacks.onPhpVersionsChanged(DaemonClient.decodePhpVersions(args[0])),
                );
            }),
        );

        this._propertiesSignalId = proxy.connect('g-properties-changed', () => {
            this.callbacks.onCliAvailabilityChanged(proxy.CliAvailable);
        });
    }

    /**
     * Signal handlers run inside the GNOME Shell main loop, where an uncaught
     * exception is reported as an extension error. A malformed payload is logged
     * and dropped instead, so one bad signal cannot take the panel down.
     */
    private _deliver(signal: string, handler: () => void): void {
        try {
            handler();
        } catch (cause) {
            this.logger.error(`Ignoring a malformed ${signal} signal: ${formatError(cause)}`);
        }
    }

    private _unsubscribe(): void {
        const proxy = this._proxy;
        if (proxy !== null && this._subscribed) {
            // The logger is captured because the extension nulls its own
            // reference as soon as disable() returns.
            const logger = this.logger;
            proxy
                .UnsubscribeAsync()
                .catch((cause: unknown) => logger.error(`Unsubscribe failed: ${formatError(cause)}`));
        }
        this._subscribed = false;
    }

    private _releaseProxy(): void {
        if (this._cancellable !== null) {
            this._cancellable.cancel();
            this._cancellable = null;
        }

        const proxy = this._proxy;
        if (proxy !== null) {
            for (const id of this._signalIds) {
                proxy.disconnectSignal(id);
            }
            if (this._propertiesSignalId !== null) {
                proxy.disconnect(this._propertiesSignalId);
            }
            this._proxy = null;
        }

        this._signalIds = [];
        this._propertiesSignalId = null;
    }
}
