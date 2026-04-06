import GLib from 'gi://GLib';
import { SymfonyServer } from '../dto/SymfonyServer';
import { LoggerInterface } from '../interfaces/LoggerInterface';

type DesiredState = 'running' | 'stopped';

export interface PollingCallbacks {
    fetchServers: () => Promise<SymfonyServer[]>;
    onStateConfirmed: (directory: string, server: SymfonyServer) => void;
    onTimeout: (directory: string, original: SymfonyServer) => void;
}

interface PollState {
    desiredState: DesiredState;
    originalServer: SymfonyServer;
    tickTimerId: number;
    timeoutTimerId: number;
    callbacks: PollingCallbacks;
}

export class ServerPollingService {
    private _pollMap: Map<string, PollState> = new Map();

    constructor(
        private _getSettings: () => { pollInterval: number; timeout: number },
        private _logger: LoggerInterface,
    ) {}

    start(directory: string, desiredState: DesiredState, original: SymfonyServer, callbacks: PollingCallbacks): void {
        this.cancel(directory);

        const { pollInterval, timeout } = this._getSettings();

        const tickTimerId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            pollInterval,
            () => {
                this._tick(directory);
                return GLib.SOURCE_CONTINUE;
            }
        );

        const timeoutTimerId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            timeout,
            () => {
                this._logger.warn(`Poll timeout for ${directory}: reverting optimistic state`);
                const state = this._pollMap.get(directory);
                this.cancel(directory);
                state?.callbacks.onTimeout(directory, original);
                return GLib.SOURCE_REMOVE;
            }
        );

        this._pollMap.set(directory, { desiredState, originalServer: original, tickTimerId, timeoutTimerId, callbacks });
    }

    cancel(directory: string): void {
        const state = this._pollMap.get(directory);
        if (!state) return;
        GLib.Source.remove(state.tickTimerId);
        GLib.Source.remove(state.timeoutTimerId);
        this._pollMap.delete(directory);
    }

    cancelAll(): void {
        for (const dir of [...this._pollMap.keys()]) {
            this.cancel(dir);
        }
    }

    private _tick(directory: string): void {
        const state = this._pollMap.get(directory);
        if (!state) return;

        state.callbacks.fetchServers()
            .then(servers => {
                const server = servers.find(s => s.directory === directory);
                if (!server) return;

                const achieved = state.desiredState === 'running' ? server.isRunning : !server.isRunning;
                if (achieved) {
                    this._logger.info(`Poll confirmed '${state.desiredState}' for ${directory}`);
                    this.cancel(directory);
                    state.callbacks.onStateConfirmed(directory, server);
                }
            })
            .catch(err => this._logger.error('Poll tick server:list failed:', err));
    }
}
