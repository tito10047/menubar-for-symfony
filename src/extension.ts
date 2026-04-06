import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import { Indicator, IndicatorType } from './ui/Indicator.js';
import { GjsProcessRunner } from './core/GjsProcessRunner.js';
import { SymfonyCliManager } from './core/SymfonyCliManager.js';
import { ConsoleLogger } from './core/logging/ConsoleLogger.js';
import { LoggerInterface } from './core/interfaces/LoggerInterface.js';
import { PhpVersion } from './core/commands/PhpListCommand.js';
import { PhpInfo } from './core/dto/PhpInfo.js';
import { SymfonyServer } from './core/commands/ServerListCommand.js';
import { FavoritesRepository } from './core/services/FavoritesRepository.js';
import { ProxyStatus } from './core/commands/ProxyStatusCommand.js';
import { openAboutDialog } from './ui/components/AboutDialog.js';

type DesiredState = 'running' | 'stopped';

interface PollState {
    desiredState: DesiredState;
    /** Server snapshot captured before the optimistic flip — used to revert on timeout. */
    originalServer: SymfonyServer;
    tickTimerId: number;
    timeoutTimerId: number;
}

export default class SymfonyMenubarExtension extends Extension {
    private _indicator: IndicatorType | null = null;
    private _manager: SymfonyCliManager | null = null;
    private _logger: LoggerInterface | null = null;
    private _lastServers: SymfonyServer[] | null = null;
    private _lastProxyStatus: ProxyStatus | null = null;
    private _pollMap: Map<string, PollState> = new Map();
    private _settings: ReturnType<Extension['getSettings']> | null = null;

    enable(): void {

        this._logger = new ConsoleLogger(this.getLogger());
        this._logger.info('Enabling extension');

        const runner = new GjsProcessRunner(this._logger);
        this._manager = new SymfonyCliManager(runner);
        this._manager.setLogger(this._logger);


        this._settings = this.getSettings();
        const favoritesRepository = new FavoritesRepository(this._settings);

        this._indicator = new Indicator({
            onRefresh: () => this._refresh(),
            favoritesRepository,
            onStartServer: (dir) => this._handleStartServer(dir),
            onStopServer: (dir) => this._handleStopServer(dir),
            onOpenBrowser: (dir) => {
                const server = this._lastServers?.find(s => s.directory === dir);
                if (server?.url) Gio.AppInfo.launch_default_for_uri(server.url, null);
            },
            onStartProxy: () => this._handleStartProxy(),
            onStopProxy: () => this._handleStopProxy(),
            onRestartProxy: () => this._handleRestartProxy(),
            onOpenProxyBrowser: () => this._handleOpenProxyBrowser(),
            onAbout: () => openAboutDialog(),
        });
        Main.panel.addToStatusArea(this.uuid, this._indicator);

        this._refresh();
    }

    disable(): void {
        this._logger?.info('Disabling extension');

        for (const dir of [...this._pollMap.keys()]) {
            this._cancelPoll(dir);
        }
        this._pollMap.clear();

        this._indicator?.destroy();
        this._indicator = null;
        this._manager = null;
        this._logger = null;
        this._lastServers = null;
        this._lastProxyStatus = null;
        this._settings = null;
    }

    private _handleStartServer(dir: string): void {
        const original = this._lastServers?.find(s => s.directory === dir);
        if (!original) {
            this._logger?.error(`Server start requested for unknown directory: ${dir}`);
            return;
        }

        this._indicator?.updateServerItem(dir, { isRunning: true, port: '' });
        this._cancelPoll(dir);

        this._manager?.runCommand<boolean>('server:start', [dir])
            .catch(err => this._logger?.error(`server:start failed for ${dir}:`, err));

        this._startPolling(dir, 'running', original);


    }

    private _handleStopServer(dir: string): void {
        const original = this._lastServers?.find(s => s.directory === dir);
        if (!original) {
            this._logger?.error(`Server start requested for unknown directory: ${dir}`);
            return;
        }

        this._indicator?.updateServerItem(dir, { isRunning: false, port: '' });
        this._cancelPoll(dir);

        this._manager?.runCommand<boolean>('server:stop', [dir])
            .catch(err => this._logger?.error(`server:stop failed for ${dir}:`, err));

        this._startPolling(dir, 'stopped', original);
    }

    private _startPolling(dir: string, desiredState: DesiredState, original: SymfonyServer): void {
        const pollInterval = this._settings?.get_int('polling-interval') ?? 5;
        const timeout = this._settings?.get_int('status-check-timeout') ?? 20;

        const tickTimerId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            pollInterval,
            () => {
                this._doPollTick(dir, desiredState);
                return GLib.SOURCE_CONTINUE;
            }
        );

        const timeoutTimerId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            timeout,
            () => {
                this._logger?.warn(`Poll timeout for ${dir}: reverting optimistic state`);
                this._cancelPoll(dir);
                this._indicator?.updateServerItem(dir, {
                    isRunning: original.isRunning,
                    port: original.isRunning ? String(original.port) : '',
                });
                return GLib.SOURCE_REMOVE;
            }
        );

        this._pollMap.set(dir, { desiredState, originalServer: original, tickTimerId, timeoutTimerId });
    }

    private _doPollTick(dir: string, desiredState: DesiredState): void {
        if (!this._manager) return;

        this._manager.runCommand<SymfonyServer[]>('server:list')
            .then(servers => {
                this._lastServers = servers;
                const server = servers.find(s => s.directory === dir);
                if (!server) return;

                const achieved = desiredState === 'running' ? server.isRunning : !server.isRunning;
                if (achieved) {
                    this._logger?.info(`Poll confirmed '${desiredState}' for ${dir}`);
                    this._cancelPoll(dir);
                    this._indicator?.updateServerItem(dir, {
                        isRunning: server.isRunning,
                        port: server.isRunning ? String(server.port) : '',
                    });
                }
            })
            .catch(err => this._logger?.error('Poll tick server:list failed:', err));
    }

    private _cancelPoll(dir: string): void {
        const state = this._pollMap.get(dir);
        if (!state) return;
        GLib.Source.remove(state.tickTimerId);
        GLib.Source.remove(state.timeoutTimerId);
        this._pollMap.delete(dir);
    }

    private _handleStartProxy(): void {
        this._manager?.runCommand<boolean>('proxy:start')
            .then(() => this._refreshProxy())
            .catch(err => this._logger?.error('proxy:start failed:', err));
    }

    private _handleStopProxy(): void {
        this._manager?.runCommand<boolean>('proxy:stop')
            .then(() => this._refreshProxy())
            .catch(err => this._logger?.error('proxy:stop failed:', err));
    }

    private _handleRestartProxy(): void {
        this._manager?.runCommand<boolean>('proxy:stop')
            .then(() => this._manager!.runCommand<boolean>('proxy:start'))
            .then(() => this._refreshProxy())
            .catch(err => this._logger?.error('proxy:restart failed:', err));
    }

    private _handleOpenProxyBrowser(): void {
        this._manager?.runCommand<string>('proxy:url')
            .then(url => { if (url) Gio.AppInfo.launch_default_for_uri(url, null); })
            .catch(err => this._logger?.error('proxy:url failed:', err));
    }

    private _refreshProxy(): void {
        if (!this._manager || !this._indicator) return;
        this._manager.runCommand<ProxyStatus>('proxy:status')
            .then(status => {
                this._lastProxyStatus = status;
                this._indicator?.updateProxyStatus(status);
            })
            .catch(err => this._logger?.error('Proxy refresh failed:', err));
    }

    private _refresh(): void {
        if (!this._manager || !this._indicator) return;

        // Cancel all active polls — fresh real data supersedes any optimistic state.
        for (const dir of [...this._pollMap.keys()]) {
            this._cancelPoll(dir);
        }

        const manager = this._manager;
        const indicator = this._indicator;

        manager.runCommand<PhpVersion[]>('local:php:list')
            .then(async versions => {
                const phpInfoMap = new Map<string, PhpInfo>();
                for (const version of versions) {
                    try {
                        const info = await manager.runCommand<PhpInfo>('php:info', [version.path]);
                        phpInfoMap.set(version.version, info);
                    } catch (err) {
                        this._logger?.error(`php:info failed for ${version.version}:`, err);
                    }
                }
                indicator.updatePhpStatus(versions, phpInfoMap);
            })
            .catch(err => {
                this._logger?.error('PHP refresh failed:', err);
            });

        manager.runCommand<SymfonyServer[]>('server:list')
            .then(servers => {
                this._lastServers = servers;
                indicator.updateServerStatus(servers);
            })
            .catch(err => {
                this._logger?.error('Server list refresh failed:', err);
            });

        this._refreshProxy();
    }
}
