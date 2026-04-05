import GObject from 'gi://GObject';
import { Button } from 'resource:///org/gnome/shell/ui/panelMenu.js';
import { PopupSeparatorMenuItem, PopupMenuSection } from 'resource:///org/gnome/shell/ui/popupMenu.js';
import St from 'gi://St';
import Clutter from 'gi://Clutter';

import { PhpVersionItem, PhpVersionItemType } from './components/PhpVersionItem.js';
import { ServerMenuItem } from './components/ServerMenuItem.js';
import { ServerRowItem } from './components/ServerRowItem.js';
import { FavoriteServersGroup, FavoriteServersGroupType } from './components/FavoriteServersGroup.js';
import { ProxyMenuItem, ProxyMenuItemType } from './components/ProxyMenuItem.js';
import { createSectionHeader } from './components/SectionHeader.js';

import { PhpVersion } from '../core/commands/PhpListCommand.js';
import { PhpInfo } from '../core/dto/PhpInfo.js';
import { SymfonyServer } from '../core/commands/ServerListCommand.js';
import { ProxyStatus } from '../core/commands/ProxyStatusCommand.js';
import { FavoritesRepositoryInterface } from '../core/services/FavoritesRepository.js';

interface IndicatorParams {
    onRefresh?: () => void;
    favoritesRepository: FavoritesRepositoryInterface;
    onStartServer: (directory: string) => void;
    onStopServer: (directory: string) => void;
    onOpenBrowser: (directory: string) => void;
}

export const Indicator = GObject.registerClass(
    class Indicator extends Button {
        declare _phpSection: InstanceType<typeof PopupMenuSection>;
        declare _serverSection: InstanceType<typeof PopupMenuSection>;
        declare _otherServersGroup: FavoriteServersGroupType;
        declare _proxyItem: ProxyMenuItemType;
        declare _favoritesRepository: FavoritesRepositoryInterface;
        declare _onRefresh: (() => void) | undefined;
        declare _onStartServer: (directory: string) => void;
        declare _onStopServer: (directory: string) => void;
        declare _onOpenBrowser: (directory: string) => void;

        _init(params: IndicatorParams) {
            super._init(0.0, 'Symfony Menubar', false);

            this._favoritesRepository = params.favoritesRepository;
            this._onRefresh = params.onRefresh;
            this._onStartServer = params.onStartServer;
            this._onStopServer = params.onStopServer;
            this._onOpenBrowser = params.onOpenBrowser;

            const topLabel = new St.Label({
                text: 'sf',
                y_align: Clutter.ActorAlign.CENTER,
            });
            this.add_child(topLabel);

            const menu = this.menu;

            // ---- PHP section ----
            menu.addMenuItem(createSectionHeader('PHP', { onRefresh: params.onRefresh }));
            this._phpSection = new PopupMenuSection();
            menu.addMenuItem(this._phpSection);
            menu.addMenuItem(new PopupSeparatorMenuItem());

            // ---- Servers section ----
            menu.addMenuItem(createSectionHeader('Servers'));
            this._serverSection = new PopupMenuSection();
            menu.addMenuItem(this._serverSection);

            this._otherServersGroup = new FavoriteServersGroup();
            menu.addMenuItem(this._otherServersGroup);
            menu.addMenuItem(new PopupSeparatorMenuItem());

            // ---- Proxy section ----
            menu.addMenuItem(createSectionHeader('Proxy'));
            this._proxyItem = new ProxyMenuItem();
            menu.addMenuItem(this._proxyItem);
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
         * Fully rebuilds the server sections from the given list.
         * Favorite servers (by directory) are shown directly; others go into the
         * collapsible "Other servers" group.
         */
        updateServerStatus(servers: SymfonyServer[]): void {
            this._serverSection.removeAll();
            this._otherServersGroup.clear();

            for (const server of servers) {
                const isFav = this._favoritesRepository.isFavorite(server.directory);
                const name = server.directory.split('/').pop() ?? server.directory;
                const port = server.isRunning ? String(server.port) : '';

                const onToggleFavorite = (dir: string) => {
                    if (this._favoritesRepository.isFavorite(dir)) {
                        this._favoritesRepository.remove(dir);
                    } else {
                        this._favoritesRepository.add(dir);
                    }
                    this._onRefresh?.();
                };

                if (isFav) {
                    const item = new ServerMenuItem({
                        directory: server.directory,
                        name,
                        port,
                        isRunning: server.isRunning,
                        isFavorite: true,
                        onToggleFavorite,
                    });
                    this._serverSection.addMenuItem(item);
                } else {
                    const item = new ServerRowItem({
                        directory: server.directory,
                        name,
                        port,
                        isRunning: server.isRunning,
                        isFavorite: false,
                        onStart: this._onStartServer,
                        onStop: this._onStopServer,
                        onOpenBrowser: this._onOpenBrowser,
                        onToggleFavorite,
                    });
                    this._otherServersGroup.addServer(server.directory, item);
                }
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
