import GObject from 'gi://GObject';
import { Button } from 'resource:///org/gnome/shell/ui/panelMenu.js';
import { PopupSeparatorMenuItem, PopupMenuSection, PopupBaseMenuItem } from 'resource:///org/gnome/shell/ui/popupMenu.js';
import St from 'gi://St';
import Clutter from 'gi://Clutter';

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
        declare _phpSection: InstanceType<typeof PopupMenuSection>;
        declare _mainServerItems: Map<string, ServerMenuItemType>;
        declare _favoriteServersGroup: FavoriteServersGroupType;
        declare _proxyItem: ProxyMenuItemType;

        _init(params: { onRefresh?: () => void } = {}) {
            super._init(0.0, 'Symfony Menubar', false);

            this._mainServerItems = new Map();

            const topLabel = new St.Label({
                text: 'sf',
                y_align: Clutter.ActorAlign.CENTER,
            });
            this.add_child(topLabel);

            const menu = this.menu;

            // ---- PHP section ----
            const phpHeader = new PopupBaseMenuItem({ reactive: false });
            const phpHeaderLabel = new St.Label({
                text: 'PHP',
                style: 'font-size: 11px; font-weight: bold; color: rgba(255,255,255,0.4); padding-top: 5px; padding-bottom: 2px;',
                x_expand: true,
            });
            phpHeaderLabel.clutter_text.ellipsize = 0;
            phpHeader.add_child(phpHeaderLabel);

            if (params.onRefresh) {
                const refreshBtn = new St.Button({
                    label: '↺',
                    reactive: true,
                    style: 'font-size: 14px; color: rgba(255,255,255,0.5); padding: 0 4px;',
                });
                refreshBtn.connect('clicked', () => params.onRefresh!());
                phpHeader.add_child(refreshBtn);
            }
            menu.addMenuItem(phpHeader);

            this._phpSection = new PopupMenuSection();
            menu.addMenuItem(this._phpSection);
            menu.addMenuItem(new PopupSeparatorMenuItem());

            // ---- Servers section ----
            menu.addMenuItem(this._createSectionHeader('Servers'));

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
            menu.addMenuItem(this._createSectionHeader('Proxy'));
            this._proxyItem = new ProxyMenuItem();
            menu.addMenuItem(this._proxyItem);
        }

        private _createSectionHeader(text: string): InstanceType<typeof PopupBaseMenuItem> {
            const header = new PopupBaseMenuItem({ reactive: false });
            const label = new St.Label({
                text: text.toUpperCase(),
                style: 'font-size: 11px; font-weight: bold; color: rgba(255, 255, 255, 0.4); padding-top: 5px; padding-bottom: 2px;',
            });
            label.clutter_text.ellipsize = 0;
            header.add_child(label);
            return header;
        }

        // ---- Public update API ----

        /**
         * Refreshes the PHP section with all available versions.
         * Default version gets a green dot; others get a gray dot.
         */
        updatePhpStatus(versions: PhpVersion[], phpInfoMap: Map<string, PhpInfo>): void {
            this._phpSection.removeAll();
            for (const version of versions) {
                const item = new PhpVersionItem();
                item.updateVersion(version.version);
                item.updateStatus(version.isDefault);
                const info = phpInfoMap.get(version.version);
                if (info) item.updateBadges(info);
                this._phpSection.addMenuItem(item);
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
