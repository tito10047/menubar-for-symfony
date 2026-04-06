import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import { Indicator, IndicatorType } from './ui/Indicator.js';
import { GjsProcessRunner } from './core/GjsProcessRunner.js';
import { SymfonyCliManager } from './core/SymfonyCliManager.js';
import { ConsoleLogger } from './core/logging/ConsoleLogger.js';
import { LoggerInterface } from './core/interfaces/LoggerInterface.js';
import { PhpVersion } from './core/dto/PhpVersion.js';
import { PhpInfo } from './core/dto/PhpInfo.js';
import { SymfonyServer } from './core/dto/SymfonyServer.js';
import { ProxyStatus } from './core/dto/ProxyStatus.js';
import { FavoritesRepository } from './core/services/FavoritesRepository.js';
import { ServerPollingService } from './core/services/ServerPollingService.js';
import { ProxyPollingService } from './core/services/ProxyPollingService.js';
import { PhpVersionFileService } from './core/services/PhpVersionFileService.js';
import { openAboutDialog } from './ui/components/AboutDialog.js';
import { openPhpVersionDialog } from './ui/dialogs/PhpVersionDialog.js';

export default class SymfonyMenubarExtension extends Extension {
    private _indicator: IndicatorType | null = null;
    private _manager: SymfonyCliManager | null = null;
    private _logger: LoggerInterface | null = null;
    private _lastServers: SymfonyServer[] | null = null;
    private _lastProxyStatus: ProxyStatus | null = null;
    private _lastPhpVersions: PhpVersion[] = [];
    private _pollingService: ServerPollingService | null = null;
    private _proxyPollingService: ProxyPollingService | null = null;
    private _settings: ReturnType<Extension['getSettings']> | null = null;
    private _phpVersionFileService: PhpVersionFileService | null = null;

    enable(): void {
        this._logger = new ConsoleLogger(this.getLogger());
        this._logger.info('Enabling extension');

        const runner = new GjsProcessRunner(this._logger);
        this._manager = new SymfonyCliManager(runner);
        this._manager.setLogger(this._logger);

        this._settings = this.getSettings();

        this._pollingService = new ServerPollingService(
            () => ({
                pollInterval: this._settings?.get_int('polling-interval') ?? 5,
                timeout: this._settings?.get_int('status-check-timeout') ?? 20,
            }),
            this._logger,
        );

        this._proxyPollingService = new ProxyPollingService(
            () => ({
                pollInterval: this._settings?.get_int('polling-interval') ?? 5,
                startupTimeout: this._settings?.get_int('proxy-startup-timeout') ?? 60,
            }),
            this._logger,
        );

        const favoritesRepository = new FavoritesRepository(this._settings);

        this._phpVersionFileService = new PhpVersionFileService(GLib);

        this._indicator = new Indicator({
            onRefresh: () => this._refresh(),
            favoritesRepository,
            onStartServer: (dir) => this._handleStartServer(dir),
            onStopServer: (dir) => this._handleStopServer(dir),
            onOpenBrowser: (dir) => {
                const server = this._lastServers?.find(s => s.directory === dir);
                if (server?.url) Gio.AppInfo.launch_default_for_uri(server.url, null);
            },
            onViewLogs: (dir) => this._handleViewLogs(dir),
            onSetPhpVersion: (dir) => this._handleSetPhpVersion(dir),
            onStartProxy: () => this._handleStartProxy(),
            onStopProxy: () => this._handleStopProxy(),
            onRestartProxy: () => this._handleRestartProxy(),
            onOpenProxyBrowser: () => this._handleOpenProxyBrowser(),
            onAbout: () => openAboutDialog(String(this.metadata['version'] ?? 1)),
        });
        Main.panel.addToStatusArea(this.uuid, this._indicator);

        this._refresh();
        this._startProxyStartupPolling();
    }

    // ---- Private guards ----

    private get _m(): SymfonyCliManager {
        if (!this._manager) throw new Error('Extension not enabled');
        return this._manager;
    }

    private get _i(): IndicatorType {
        if (!this._indicator) throw new Error('Extension not enabled');
        return this._indicator;
    }

    disable(): void {
        this._logger?.info('Disabling extension');

        this._pollingService?.cancelAll();
        this._proxyPollingService?.cancel();
        this._indicator?.destroy();

        this._indicator = null;
        this._manager = null;
        this._logger = null;
        this._lastServers = null;
        this._lastProxyStatus = null;
        this._lastPhpVersions = [];
        this._pollingService = null;
        this._proxyPollingService = null;
        this._settings = null;
        this._phpVersionFileService = null;
    }

    private _handleStartServer(dir: string): void {
        const original = this._lastServers?.find(s => s.directory === dir);
        if (!original) {
            this._logger?.error(`Server start requested for unknown directory: ${dir}`);
            return;
        }

        this._i.updateServerItem(dir, { isRunning: true, port: '' });

        this._m.runCommand<boolean>('server:start', [dir])
            .catch(err => this._logger?.error(`server:start failed for ${dir}:`, err));

        this._pollingService?.start(dir, 'running', original, {
            fetchServers: () => this._m.runCommand<SymfonyServer[]>('server:list'),
            onStateConfirmed: (d, server) => {
                this._lastServers = this._lastServers?.map(s => s.directory === d ? server : s) ?? [server];
                this._indicator?.updateServerItem(d, {
                    isRunning: server.isRunning,
                    port: server.isRunning ? String(server.port) : '',
                });
            },
            onTimeout: (d, orig) => {
                this._indicator?.updateServerItem(d, {
                    isRunning: orig.isRunning,
                    port: orig.isRunning ? String(orig.port) : '',
                });
            },
        });
    }

    private _handleStopServer(dir: string): void {
        const original = this._lastServers?.find(s => s.directory === dir);
        if (!original) {
            this._logger?.error(`Server stop requested for unknown directory: ${dir}`);
            return;
        }

        this._i.updateServerItem(dir, { isRunning: false, port: '' });

        this._m.runCommand<boolean>('server:stop', [dir])
            .catch(err => this._logger?.error(`server:stop failed for ${dir}:`, err));

        this._pollingService?.start(dir, 'stopped', original, {
            fetchServers: () => this._m.runCommand<SymfonyServer[]>('server:list'),
            onStateConfirmed: (d, server) => {
                this._lastServers = this._lastServers?.map(s => s.directory === d ? server : s) ?? [server];
                this._indicator?.updateServerItem(d, {
                    isRunning: server.isRunning,
                    port: server.isRunning ? String(server.port) : '',
                });
            },
            onTimeout: (d, orig) => {
                this._indicator?.updateServerItem(d, {
                    isRunning: orig.isRunning,
                    port: orig.isRunning ? String(orig.port) : '',
                });
            },
        });
    }

    private _handleSetPhpVersion(dir: string): void {
        const currentVersion = this._phpVersionFileService?.read(dir) ?? null;
        const serverName = dir.split('/').pop() ?? dir;
        openPhpVersionDialog({
            serverName,
            currentVersion,
            availableVersions: this._lastPhpVersions,
            onSelect: (version) => {
                this._phpVersionFileService?.write(dir, version);
                this._logger?.info(`[SymfonyMenubar] Set PHP version ${version} for ${dir}`);
                this._indicator?.updateServerPhpVersion(dir, version);
            },
        });
    }

    private _handleStartProxy(): void {
        this._m.runCommand<boolean>('proxy:start')
            .then(() => this._refreshProxy())
            .catch(err => this._logger?.error('proxy:start failed:', err));
    }

    private _handleStopProxy(): void {
        this._m.runCommand<boolean>('proxy:stop')
            .then(() => this._refreshProxy())
            .catch(err => this._logger?.error('proxy:stop failed:', err));
    }

    private _handleRestartProxy(): void {
        this._m.runCommand<boolean>('proxy:stop')
            .then(() => this._m.runCommand<boolean>('proxy:start'))
            .then(() => this._refreshProxy())
            .catch(err => this._logger?.error('proxy:restart failed:', err));
    }

    private _handleOpenProxyBrowser(): void {
        this._m.runCommand<string>('proxy:url')
            .then(url => { if (url) Gio.AppInfo.launch_default_for_uri(url, null); })
            .catch(err => this._logger?.error('proxy:url failed:', err));
    }

    private _handleViewLogs(dir: string): void {
        const args = ['symfony', 'server:log', `--dir=${dir}`];
        const terminals: string[][] = [
            ['ptyxis', '--', ...args],
            ['gnome-terminal', '--', ...args],
            ['kgx', '--', ...args],
            ['konsole', '-e', ...args],
            ['xterm', '-e', ...args],
        ];

        for (const termArgs of terminals) {
            try {
                Gio.Subprocess.new(termArgs, Gio.SubprocessFlags.NONE);
                this._logger?.info(`Opened log terminal for ${dir}`);
                return;
            } catch (_e) {
                this._logger?.error(`Failed to open terminal with args: ${termArgs.join(' ')}`,_e);
            }
        }
        this._logger?.error(`Could not open any terminal for logs: ${dir}`);
    }

    private _refreshProxy(): void {
        this._m.runCommand<ProxyStatus>('proxy:status')
            .then(status => {
                this._lastProxyStatus = status;
                this._i.updateProxyStatus(status);
            })
            .catch(err => this._logger?.error('Proxy refresh failed:', err));
    }

    private _startProxyStartupPolling(): void {
        this._proxyPollingService?.startStartupPolling({
            fetchProxyStatus: () => this._m.runCommand<ProxyStatus>('proxy:status'),
            onProxyStarted: (status) => {
                this._lastProxyStatus = status;
                this._indicator?.updateProxyStatus(status);
            },
        });
    }

    private _refresh(): void {
        // Cancel all active polls — fresh real data supersedes any optimistic state.
        this._pollingService?.cancelAll();

        const manager = this._m;
        const indicator = this._i;

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
                this._lastPhpVersions = versions;
                indicator.updatePhpStatus(versions, phpInfoMap);
            })
            .catch(err => this._logger?.error('PHP refresh failed:', err));

        manager.runCommand<SymfonyServer[]>('server:list')
            .then(servers => {
                for (const server of servers) {
                    server.phpVersion = this._phpVersionFileService?.read(server.directory) ?? undefined;
                }
                this._lastServers = servers;
                indicator.updateServerStatus(servers);
            })
            .catch(err => this._logger?.error('Server list refresh failed:', err));

        this._refreshProxy();
    }
}
