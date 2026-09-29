import GLib from 'gi://GLib';
import { ServerWire, ProxyWire } from '../shared/dbus/wire.js';
import { LoggerInterface } from '../shared/interfaces/LoggerInterface.js';
import { formatError } from '../shared/errors.js';

/** Interval used briefly after a command that is expected to change the state. */
const BURST_INTERVAL_SECONDS = 1;
/** How long that faster interval is kept before returning to the configured one. */
const BURST_DURATION_SECONDS = 15;

const MICROS_PER_SECOND = 1_000_000;

export interface ProxySnapshot {
    isRunning: boolean;
    proxies: ProxyWire[];
}

export interface StateSource {
    listServers(): Promise<ServerWire[]>;
    getProxyStatus(): Promise<ProxySnapshot>;
}

export interface StateListener {
    onServersChanged(servers: ServerWire[]): void;
    onProxyChanged(snapshot: ProxySnapshot): void;
}

/**
 * Polls the Symfony CLI and reports changes.
 *
 * This replaces the two polling services that used to live in the extension, so
 * that gnome-shell no longer owns any timers of its own. Polling only runs while
 * a client is subscribed, and it notifies only on an actual change, which keeps
 * the bus quiet while nothing is happening.
 */
export class StateWatcher {
    private _timerId: number | null = null;
    private _activeIntervalSeconds: number | null = null;
    private _configuredIntervalSeconds: number;
    private _burstDeadlineMicros = 0;
    private _pollInFlight = false;
    private _lastServers: string | null = null;
    private _lastProxy: string | null = null;
    private _lastFailure: string | null = null;

    constructor(
        private readonly source: StateSource,
        private readonly listener: StateListener,
        private readonly logger: LoggerInterface,
        configuredIntervalSeconds: number,
    ) {
        this._configuredIntervalSeconds = normalizeInterval(configuredIntervalSeconds);
    }

    get running(): boolean {
        return this._timerId !== null;
    }

    /** Starts polling and reports the current state immediately. */
    start(): void {
        if (this._timerId === null) {
            this.logger.info(`Starting status polling every ${this._configuredIntervalSeconds}s`);
            this._arm(this._configuredIntervalSeconds);
        }
        this._poll();
    }

    stop(): void {
        if (this._timerId !== null) {
            GLib.Source.remove(this._timerId);
            this._timerId = null;
            this._activeIntervalSeconds = null;
            this._burstDeadlineMicros = 0;
            // Forget the last snapshots so that a later start() reports the
            // current state to the new subscriber instead of staying silent.
            this._lastServers = null;
            this._lastProxy = null;
            this._lastFailure = null;
            this.logger.info('Stopped status polling');
        }
    }

    setConfiguredInterval(seconds: number): void {
        const normalized = normalizeInterval(seconds);
        if (normalized !== this._configuredIntervalSeconds) {
            this.logger.info(`Status polling interval changed to ${normalized}s`);
            this._configuredIntervalSeconds = normalized;
            this._rearmIfIntervalChanged();
        }
    }

    /**
     * Polls faster for a short while. Called after a command that is expected to
     * change the state, so that the UI confirms it in about a second instead of
     * waiting for the next regular tick.
     */
    requestFastPolling(): void {
        this._burstDeadlineMicros = GLib.get_monotonic_time() + BURST_DURATION_SECONDS * MICROS_PER_SECOND;
        this._rearmIfIntervalChanged();
        this._poll();
    }

    private _desiredIntervalSeconds(): number {
        const bursting = GLib.get_monotonic_time() < this._burstDeadlineMicros;
        return bursting
            ? Math.min(BURST_INTERVAL_SECONDS, this._configuredIntervalSeconds)
            : this._configuredIntervalSeconds;
    }

    private _rearmIfIntervalChanged(): void {
        if (this._timerId === null) {
            return;
        }

        const desired = this._desiredIntervalSeconds();
        if (desired !== this._activeIntervalSeconds) {
            GLib.Source.remove(this._timerId);
            this._timerId = null;
            this._arm(desired);
        }
    }

    private _arm(intervalSeconds: number): void {
        this._activeIntervalSeconds = intervalSeconds;
        this._timerId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, intervalSeconds, () => this._onTick());
    }

    private _onTick(): boolean {
        this._poll();

        const desired = this._desiredIntervalSeconds();
        if (desired !== this._activeIntervalSeconds) {
            // Replace this source with one at the new interval. Clearing the id
            // first keeps _arm() from touching the source that is still running.
            this._timerId = null;
            this._arm(desired);
            return GLib.SOURCE_REMOVE;
        }

        return GLib.SOURCE_CONTINUE;
    }

    private _poll(): void {
        if (this._pollInFlight) {
            this.logger.debug('Skipping status poll: the previous one has not finished yet');
            return;
        }
        this._pollInFlight = true;

        Promise.all([this.source.listServers(), this.source.getProxyStatus()])
            .then(([servers, proxy]) => {
                this._lastFailure = null;
                this._reportServers(servers);
                this._reportProxy(proxy);
            })
            .catch((cause: unknown) => this._reportFailure(formatError(cause)))
            .finally(() => {
                this._pollInFlight = false;
            });
    }

    private _reportServers(servers: ServerWire[]): void {
        const snapshot = JSON.stringify(servers);
        if (snapshot !== this._lastServers) {
            this._lastServers = snapshot;
            this.logger.debug(`Server state changed: ${servers.length} server(s)`);
            this.listener.onServersChanged(servers);
        }
    }

    private _reportProxy(proxy: ProxySnapshot): void {
        const snapshot = JSON.stringify(proxy);
        if (snapshot !== this._lastProxy) {
            this._lastProxy = snapshot;
            this.logger.debug(`Proxy state changed: running=${proxy.isRunning}`);
            this.listener.onProxyChanged(proxy);
        }
    }

    /**
     * Failures are always logged, but a failure that repeats every tick — a
     * missing CLI, for instance — is only shouted about once so that it does not
     * flood the journal.
     */
    private _reportFailure(message: string): void {
        if (message === this._lastFailure) {
            this.logger.debug(`Status poll still failing: ${message}`);
            return;
        }
        this._lastFailure = message;
        this.logger.warn(`Status poll failed: ${message}`);
    }
}

function normalizeInterval(seconds: number): number {
    return Number.isFinite(seconds) && seconds >= 1 ? Math.floor(seconds) : 1;
}
