import GObject from 'gi://GObject';
import GLib from 'gi://GLib';
import { Button } from 'resource:///org/gnome/shell/ui/panelMenu.js';
import { PopupSeparatorMenuItem, PopupMenuSection, PopupImageMenuItem } from 'resource:///org/gnome/shell/ui/popupMenu.js';
import St from 'gi://St';
import Clutter from 'gi://Clutter';

import { PhpVersionItem } from './components/PhpVersionItem.js';
import { ServerMenuItem } from './components/ServerMenuItem.js';
import { ServerRowItem } from './components/ServerRowItem.js';
import { FavoriteServersGroup, FavoriteServersGroupType } from './components/FavoriteServersGroup.js';
import { ProxyMenuItem, ProxyMenuItemType } from './components/ProxyMenuItem.js';
import { createSectionHeader } from './components/SectionHeader.js';

import { PhpVersion } from '../core/dto/PhpVersion.js';
import { PhpInfo } from '../core/dto/PhpInfo.js';
import { SymfonyServer } from '../core/dto/SymfonyServer.js';
import { ProxyStatus } from '../core/dto/ProxyStatus.js';
import { CustomAction } from '../core/dto/CustomAction.js';
import { FavoritesRepositoryInterface } from '../core/services/FavoritesRepository.js';
import { CustomActionsLoader } from '../core/services/CustomActionsLoader.js';
import { ServerItemInterface } from './components/ServerItemInterface.js';

interface IndicatorParams {
    extensionPath: string;
    onRefresh?: () => void;
    favoritesRepository: FavoritesRepositoryInterface;
    onStartServer: (directory: string) => void;
    onStopServer: (directory: string) => void;
    onOpenBrowser: (directory: string) => void;
    onViewLogs: (directory: string) => void;
    onSetPhpVersion: (directory: string) => void;
    onStartProxy: () => void;
    onStopProxy: () => void;
    onRestartProxy: () => void;
    onOpenProxyBrowser: () => void;
    onAbout?: () => void;
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
        declare _onViewLogs: (directory: string) => void;
        declare _onSetPhpVersion: (directory: string) => void;
        declare _serverItemMap: Map<string, ServerItemInterface>;
        declare _customActions: CustomAction[];

        _init(params: IndicatorParams) {
            super._init(0.0, 'Symfony Menubar', false);

            this._favoritesRepository = params.favoritesRepository;
            this._onRefresh = params.onRefresh;
            this._customActions = this._loadCustomActions(params.extensionPath);
            this._onStartServer = params.onStartServer;
            this._onStopServer = params.onStopServer;
            this._onOpenBrowser = params.onOpenBrowser;
            this._onViewLogs = params.onViewLogs;
            this._onSetPhpVersion = params.onSetPhpVersion;
            this._serverItemMap = new Map();

            const topLabel = new St.Label({
                text: 'sf',
                y_align: Clutter.ActorAlign.CENTER,
            });
            this.add_child(topLabel);

            const menu = this.menu;
            menu.actor.add_style_class_name('symfony-menubar-menu');

            // ---- PHP section ----
            menu.addMenuItem(createSectionHeader('PHP', { onRefresh: params.onRefresh }));
            this._phpSection = new PopupMenuSection();
            menu.addMenuItem(this._phpSection);
            menu.addMenuItem(new PopupSeparatorMenuItem());

            // ---- Servers section ----
            menu.addMenuItem(createSectionHeader('Servers', { onRefresh: params.onRefresh }));
            this._serverSection = new PopupMenuSection();
            menu.addMenuItem(this._serverSection);

            this._otherServersGroup = new FavoriteServersGroup();
            menu.addMenuItem(this._otherServersGroup);
            menu.addMenuItem(new PopupSeparatorMenuItem());

            // ---- Proxy section ----
            menu.addMenuItem(createSectionHeader('Proxy', { onRefresh: params.onRefresh }));
            this._proxyItem = new ProxyMenuItem({
                onStart: params.onStartProxy,
                onStop: params.onStopProxy,
                onRestart: params.onRestartProxy,
                onOpenBrowser: params.onOpenProxyBrowser,
            });
            menu.addMenuItem(this._proxyItem);

            // ---- About ----
            menu.addMenuItem(new PopupSeparatorMenuItem());
            const aboutItem = new PopupImageMenuItem('About', 'help-about-symbolic');
            aboutItem.connect('activate', () => params.onAbout?.());
            menu.addMenuItem(aboutItem);
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
         * Also resets the server item registry used for targeted optimistic updates.
         */
        updateServerStatus(servers: SymfonyServer[]): void {
            this._serverSection.removeAll();
            this._otherServersGroup.clear();
            this._serverItemMap.clear();

            for (const server of servers) {
                const isFav = this._favoritesRepository.isFavorite(server.directory);
                const name = this._serverName(server.directory);
                const port = server.isRunning ? String(server.port) : '';

                if (isFav) {
                    const item = new ServerMenuItem({
                        directory: server.directory,
                        name,
                        port,
                        isRunning: server.isRunning,
                        isFavorite: true,
                        phpVersion: server.phpVersion ?? null,
                        onToggleFavorite: (dir) => this._toggleFavorite(dir),
                        onStart: this._onStartServer,
                        onStop: this._onStopServer,
                        onOpenBrowser: this._onOpenBrowser,
                        onViewLogs: this._onViewLogs,
                        onSetPhpVersion: this._onSetPhpVersion,
                        customActions: this._customActions,
                        onCustomAction: (action, dir) => this._executeCustomAction(action, dir),
                    });
                    this._serverSection.addMenuItem(item);
                    this._serverItemMap.set(server.directory, item);
                } else {
                    const item = new ServerRowItem({
                        directory: server.directory,
                        name,
                        port,
                        isRunning: server.isRunning,
                        isFavorite: false,
                        phpVersion: server.phpVersion ?? null,
                        onStart: this._onStartServer,
                        onStop: this._onStopServer,
                        onOpenBrowser: this._onOpenBrowser,
                        onToggleFavorite: (dir) => this._toggleFavorite(dir),
                        onViewLogs: this._onViewLogs,
                        onSetPhpVersion: this._onSetPhpVersion,
                        customActions: this._customActions,
                        onCustomAction: (action, dir) => this._executeCustomAction(action, dir),
                    });
                    this._otherServersGroup.addServer(server.directory, item);
                    this._serverItemMap.set(server.directory, item);
                }
            }
        }

        _serverName(directory: string): string {
            return directory.split('/').pop() ?? directory;
        }

        _toggleFavorite(directory: string): void {
            if (this._favoritesRepository.isFavorite(directory)) {
                this._favoritesRepository.remove(directory);
            } else {
                this._favoritesRepository.add(directory);
            }
            this._onRefresh?.();
        }

        /**
         * Updates the UI of a single server item in place (optimistic or confirmed update).
         * Safe no-op if the item is not in the registry (e.g., full rebuild happened first).
         */
        updateServerItem(directory: string, state: { isRunning: boolean; port: string }): void {
            const item = this._serverItemMap.get(directory);
            if (!item) return;
            item.updateStatus(state.isRunning);
            item.updatePort(state.port);
        }

        /**
         * Updates the PHP version badge of a single server item in place.
         * Safe no-op if the item is not in the registry.
         */
        updateServerPhpVersion(directory: string, version: string | null): void {
            const item = this._serverItemMap.get(directory);
            if (!item) return;
            item.updatePhpVersion(version);
        }

        /**
         * Updates proxy section status dot, label, and domain list.
         */
        updateProxyStatus(status: ProxyStatus): void {
            this._proxyItem.updateStatus(status.isRunning, status.proxies);
        }

        _loadCustomActions(extensionPath: string): CustomAction[] {
            const loader = new CustomActionsLoader(GLib);
            return loader.load(extensionPath);
        }

        _executeCustomAction(action: CustomAction, serverDirectory: string): void {
            const rawPath = (action.path ?? serverDirectory).replace(/\{path\}/g, serverDirectory);
            const command = action.command.replace(/\{path\}/g, serverDirectory);
            const dir = rawPath.startsWith('~/') ? GLib.get_home_dir() + rawPath.slice(1) : rawPath;
            const escapedDir = dir.replace(/'/g, "'\\''");
            try {
                GLib.spawn_command_line_async(`bash -c "cd '${escapedDir}' && ${command}"`);
            } catch { /* silent — extension must not crash on action failure */ }
        }
    }
);

export type IndicatorType = InstanceType<typeof Indicator>;
