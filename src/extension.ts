import GLib from 'gi://GLib';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import { Indicator, IndicatorType } from './ui/Indicator.js';
import { GjsProcessRunner } from './core/GjsProcessRunner.js';
import { SymfonyCliManager } from './core/SymfonyCliManager.js';
import { ConsoleLogger } from './core/logging/ConsoleLogger.js';
import { LoggerInterface } from './core/interfaces/LoggerInterface.js';
import { PhpVersion } from './core/commands/PhpListCommand.js';
import { PhpInfo } from './core/dto/PhpInfo.js';

const REFRESH_INTERVAL_SECONDS = 30;

export default class SymfonyMenubarExtension extends Extension {
    private _indicator: IndicatorType | null = null;
    private _manager: SymfonyCliManager | null = null;
    private _logger: LoggerInterface | null = null;
    private _refreshTimer: number | null = null;

    enable(): void {
        this._logger = new ConsoleLogger();
        this._logger.info('Enabling extension');
        const runner = new GjsProcessRunner(this._logger);
        this._manager = new SymfonyCliManager(runner);
        this._manager.setLogger(this._logger);

        this._indicator = new Indicator({ onRefresh: () => this._refresh() });
        Main.panel.addToStatusArea(this.uuid, this._indicator);

        // Prvý refresh ihneď
        this._refresh();

        // Periodický refresh
        this._refreshTimer = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            REFRESH_INTERVAL_SECONDS,
            () => {
                this._refresh();
                return GLib.SOURCE_CONTINUE;
            }
        );
    }

    disable(): void {
        this._logger?.info('Disabling extension');
        if (this._refreshTimer !== null) {
            GLib.Source.remove(this._refreshTimer);
            this._refreshTimer = null;
        }
        this._indicator?.destroy();
        this._indicator = null;
        this._manager = null;
        this._logger = null;
    }

    private _refresh(): void {
        if (!this._manager || !this._indicator) return;

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
    }
}
