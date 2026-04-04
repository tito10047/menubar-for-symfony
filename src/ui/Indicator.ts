import GObject from 'gi://GObject';
import { Button } from 'resource:///org/gnome/shell/ui/panelMenu.js';
import { PopupSeparatorMenuItem } from 'resource:///org/gnome/shell/ui/popupMenu.js';
import St from 'gi://St';
import Clutter from 'gi://Clutter';

import { createSectionHeader } from './components/SectionHeader.js';
import { PhpVersionItem, PhpVersionItemType } from './components/PhpVersionItem.js';
import { ServerMenuItem, ServerMenuItemType } from './components/ServerMenuItem.js';
import { FavoriteServersGroup, FavoriteServersGroupType } from './components/FavoriteServersGroup.js';
import { ProxyMenuItem, ProxyMenuItemType } from './components/ProxyMenuItem.js';

import { PhpVersion } from '../core/commands/PhpListCommand.js';
import { PhpInfo } from '../core/dto/PhpInfo.js';
import { SymfonyServer } from '../core/commands/ServerListCommand.js';
import { ProxyStatus } from '../core/commands/ProxyStatusCommand.js';

export const Indicator = GObject.registerClass(
    class Indicator extends Button {
        declare _phpItem: PhpVersionItemType;
        declare _mainServerItems: Map<string, ServerMenuItemType>;
        declare _favoriteServersGroup: FavoriteServersGroupType;
        declare _proxyItem: ProxyMenuItemType;

        _init() {
            super._init(0.0, 'Symfony Menubar', false);

            this._mainServerItems = new Map();

            const topLabel = new St.Label({
                text: 'sf',
                y_align: Clutter.ActorAlign.CENTER,
            });
            this.add_child(topLabel);

            const menu = this.menu;

            // ---- PHP section ----
            menu.addMenuItem(createSectionHeader('PHP'));
            this._phpItem = new PhpVersionItem();
            menu.addMenuItem(this._phpItem);
            menu.addMenuItem(new PopupSeparatorMenuItem());

            // ---- Servers section ----
            menu.addMenuItem(createSectionHeader('Servers'));

            const server1 = new ServerMenuItem({
                name: 'my-super-project',
                port: '8000',
                isRunning: true,
                isFavorite: false,
            });
            const server2 = new ServerMenuItem({
                name: 'old-project',
                port: '',
                isRunning: false,
                isFavorite: false,
            });
            this._mainServerItems.set('my-super-project', server1);
            this._mainServerItems.set('old-project', server2);
            menu.addMenuItem(server1);
            menu.addMenuItem(server2);
            menu.addMenuItem(new PopupSeparatorMenuItem());

            // ---- Favorite servers collapsible group ----
            this._favoriteServersGroup = new FavoriteServersGroup();
            for (let i = 1; i <= 30; i++) {
                const isRunning = i % 2 !== 0;
                const port = isRunning ? String(8000 + i) : '';
                this._favoriteServersGroup.addServer(`project-${i}`, {
                    name: `project-${i}`,
                    port,
                    isRunning,
                    isFavorite: true,
                });
            }
            menu.addMenuItem(this._favoriteServersGroup);
            menu.addMenuItem(new PopupSeparatorMenuItem());

            // ---- Proxy section ----
            menu.addMenuItem(createSectionHeader('Proxy'));
            this._proxyItem = new ProxyMenuItem();
            menu.addMenuItem(this._proxyItem);
        }

        // ---- Public update API ----

        /**
         * Refreshes the PHP row.
         * Picks the default version; falls back to the first entry in the list.
         */
        updatePhpStatus(versions: PhpVersion[], phpInfoMap: Map<string, PhpInfo>): void {
            const active = versions.find(v => v.isDefault) ?? versions[0];
            if (!active) return;

            this._phpItem.updateVersion(active.version);
            this._phpItem.updateStatus(true);

            const info = phpInfoMap.get(active.version);
            if (info) {
                this._phpItem.updateBadges(info);
            }
        }

        /**
         * Reconciles the server list in-place: updates existing items, adds new
         * ones to the favorites group. Does not remove items that disappeared
         * from the list — call destroy() on this indicator for a full reset.
         */
        updateServerStatus(servers: SymfonyServer[]): void {
            for (const server of servers) {
                const mainItem = this._mainServerItems.get(server.directory);
                if (mainItem) {
                    mainItem.updateStatus(server.isRunning);
                    mainItem.updatePort(server.isRunning ? String(server.port) : '');
                    continue;
                }

                const favoriteItem = this._favoriteServersGroup.getServer(server.directory);
                if (favoriteItem) {
                    favoriteItem.updateStatus(server.isRunning);
                    favoriteItem.updatePort(server.isRunning ? String(server.port) : '');
                    continue;
                }

                // Unknown server — add it to the favorites group.
                this._favoriteServersGroup.addServer(server.directory, {
                    name: server.directory,
                    port: server.isRunning ? String(server.port) : '',
                    isRunning: server.isRunning,
                    isFavorite: true,
                });
            }
        }

        /**
         * Updates proxy section status dot and label.
         * Port is not yet available in ProxyStatus; pass it explicitly when known.
         */
        updateProxyStatus(status: ProxyStatus, port?: number): void {
            this._proxyItem.updateStatus(status.isRunning, port);
        }
    }
);

export type IndicatorType = InstanceType<typeof Indicator>;
