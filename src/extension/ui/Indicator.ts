import GObject from 'gi://GObject';
import { Button } from 'resource:///org/gnome/shell/ui/panelMenu.js';
import { PopupSeparatorMenuItem, PopupMenuSection, PopupImageMenuItem, PopupMenuItem } from 'resource:///org/gnome/shell/ui/popupMenu.js';
import St from 'gi://St';
import Clutter from 'gi://Clutter';

import { PhpVersionItem } from './components/PhpVersionItem.js';
import { ServerMenuItem } from './components/ServerMenuItem.js';
import { ServerRowItem, ServerRowItemParams } from './components/ServerRowItem.js';
import { FavoriteServersGroup, FavoriteServersGroupType } from './components/FavoriteServersGroup.js';
import { ProxyMenuItem, ProxyMenuItemType } from './components/ProxyMenuItem.js';
import { createSectionHeader } from './components/SectionHeader.js';

import { PhpVersion } from '../../shared/dto/PhpVersion.js';
import { PhpInfo } from '../../shared/dto/PhpInfo.js';
import { SymfonyServer } from '../../shared/dto/SymfonyServer.js';
import { ProxyStatus } from '../../shared/dto/ProxyStatus.js';
import { CustomActionDescriptor } from '../../shared/dto/CustomActionDescriptor.js';
import { FavoritesRepositoryInterface } from '../core/services/FavoritesRepository.js';
import { ServerItemInterface } from './components/ServerItemInterface.js';
import { menuStructureKey, phpSectionKey, sameCustomActions } from './serverMenuState.js';

/** Options for an update that may have to wait for the menu to close. */
export interface ServerUpdateOptions {
    /**
     * Rebuild even with the menu open. Set for updates the user just asked for —
     * a favorite toggle or the refresh button — where waiting would look broken.
     */
    immediate?: boolean;
}

interface IndicatorParams {
    onRefresh?: () => void;
    favoritesRepository: FavoritesRepositoryInterface;
    onStartServer: (directory: string) => void;
    onStopServer: (directory: string) => void;
    onOpenBrowser: (directory: string) => void;
    onViewLogs: (directory: string) => void;
    onSetPhpVersion: (directory: string) => void;
    /** Asks the helper daemon to run the action; the menu never runs commands. */
    onCustomAction: (actionId: string, directory: string) => void;
    onStartProxy: () => void;
    onStopProxy: () => void;
    onRestartProxy: () => void;
    onOpenProxyBrowser: () => void;
    /** Invoked when the user clicks the status message shown instead of the menu. */
    onStatusActivated?: () => void;
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
        declare _onCustomAction: (actionId: string, directory: string) => void;
        declare _serverItemMap: Map<string, ServerItemInterface>;
        declare _customActions: CustomActionDescriptor[];
        declare _statusItem: InstanceType<typeof PopupMenuItem>;
        /** Structure the server sections are currently built from. */
        declare _renderedStructureKey: string;
        /** State the PHP section is currently built from. */
        declare _renderedPhpKey: string;
        /** A rebuild that is waiting for the menu to close. */
        declare _pendingServers: SymfonyServer[] | null;

        // @ts-ignore - GObject._init overload signature mismatch in @girs types
        _init(params: IndicatorParams) {
            super._init(0.0, 'Symfony Menubar', false);

            this._favoritesRepository = params.favoritesRepository;
            this._onRefresh = params.onRefresh;
            this._customActions = [];
            this._renderedStructureKey = '';
            this._renderedPhpKey = '';
            this._pendingServers = null;
            this._onStartServer = params.onStartServer;
            this._onStopServer = params.onStopServer;
            this._onOpenBrowser = params.onOpenBrowser;
            this._onViewLogs = params.onViewLogs;
            this._onSetPhpVersion = params.onSetPhpVersion;
            this._onCustomAction = params.onCustomAction;
            this._serverItemMap = new Map();

            const topLabel = new St.Label({
                text: 'sf',
                y_align: Clutter.ActorAlign.CENTER,
            });
            this.add_child(topLabel);

            // @ts-ignore - PopupMenu/PopupDummyMenu union type in @girs; actor always has add_style_class_name at runtime
            const menu = this.menu as any;

            // ---- PHP section ----
            menu.addMenuItem(createSectionHeader('PHP', { onRefresh: params.onRefresh }));
            this._phpSection = new PopupMenuSection();
            menu.addMenuItem(this._phpSection);
            menu.addMenuItem(new PopupSeparatorMenuItem());

            // ---- Servers section ----
            menu.addMenuItem(createSectionHeader('Servers', { onRefresh: params.onRefresh }));
            this._serverSection = new PopupMenuSection();
            menu.addMenuItem(this._serverSection);

            // @ts-ignore - GObject subclass constructor type mismatch in @girs
            this._otherServersGroup = new FavoriteServersGroup();
            menu.addMenuItem(this._otherServersGroup);

            // Carries whatever stops the menu from working: a missing helper
            // daemon, an incompatible one, or a missing Symfony CLI. Clicking it
            // lets the extension try again without a restart.
            this._statusItem = new PopupMenuItem('');
            this._statusItem.connect('activate', () => params.onStatusActivated?.());
            menu.addMenuItem(this._statusItem);
            this._statusItem.visible = false;

            menu.addMenuItem(new PopupSeparatorMenuItem());

            // ---- Proxy section ----
            menu.addMenuItem(createSectionHeader('Proxy', { onRefresh: params.onRefresh }));
            // @ts-ignore - GObject subclass constructor type mismatch in @girs
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

            menu.connect('open-state-changed', (_menu: unknown, open: boolean) => {
                if (open) return;
                this._flushPendingServers();
            });
        }

        // ---- Public update API ----

        updatePhpStatus(versions: PhpVersion[], phpInfoMap: Map<string, PhpInfo>): void {
            const key = phpSectionKey(versions, phpInfoMap);
            if (key === this._renderedPhpKey) return;
            this._renderedPhpKey = key;

            this._phpSection.removeAll();
            for (const version of versions) {
                const item = new PhpVersionItem();
                item.updateVersion(version.version);
                item.updateStatus(version.isDefault);
                const info = phpInfoMap.get(version.version);
                if (info) item.updateBadges(info);
                this._phpSection.addMenuItem(item as any);
            }
        }

        /**
         * Hands the action list to the existing server items, since actions arrive
         * asynchronously. The list is usually the same one again, and rebuilding
         * the menu for it would close whatever the user has open.
         */
        updateCustomActions(actions: CustomActionDescriptor[]): void {
            if (sameCustomActions(this._customActions, actions)) return;

            this._customActions = actions;
            for (const item of this._serverItemMap.values()) {
                item.updateCustomActions(actions);
            }
        }

        /**
         * Applies a server report. The arrangement of the sections rarely changes,
         * so the common case only updates the existing items: a rebuild destroys
         * the item owning an open submenu, which looks like the menu closing by
         * itself. A genuine structural change waits for the menu to close, unless
         * the user asked for it.
         */
        updateServerStatus(servers: SymfonyServer[], options: ServerUpdateOptions = {}): void {
            const key = menuStructureKey(
                servers,
                directory => this._favoritesRepository.isFavorite(directory),
            );

            if (key === this._renderedStructureKey) {
                this._updateExistingItems(servers);
                return;
            }

            // @ts-ignore - PopupMenu/PopupDummyMenu union type in @girs; isOpen exists at runtime
            if (this.menu.isOpen && options.immediate !== true) {
                this._pendingServers = servers;
                // The items that survive the pending rebuild can still be kept
                // current; only their arrangement has to wait.
                this._updateExistingItems(servers);
                return;
            }

            this._pendingServers = null;
            this._renderServers(servers, key);
        }

        _updateExistingItems(servers: SymfonyServer[]): void {
            for (const server of servers) {
                this.updateServerItem(server.directory, {
                    isRunning: server.isRunning,
                    port: server.isRunning ? String(server.port) : '',
                });
                this.updateServerPhpVersion(server.directory, server.phpVersion ?? null);
            }
        }

        _flushPendingServers(): void {
            const pending = this._pendingServers;
            if (pending === null) return;

            this._pendingServers = null;
            this.updateServerStatus(pending, { immediate: true });
        }

        _renderServers(servers: SymfonyServer[], structureKey: string): void {
            this._renderedStructureKey = structureKey;
            this._serverSection.removeAll();
            this._otherServersGroup.clear();
            this._serverItemMap.clear();

            for (const server of servers) {
                const isFav = this._favoritesRepository.isFavorite(server.directory);
                const name = this._serverName(server.directory);
                const port = server.isRunning ? String(server.port) : '';

                if (isFav) {
                    // @ts-ignore - GObject subclass constructor type mismatch in @girs
                    const item = new ServerMenuItem({
                        directory: server.directory,
                        name,
                        port,
                        isRunning: server.isRunning,
                        isFavorite: true,
                        phpVersion: server.phpVersion ?? null,
                        onToggleFavorite: (dir: string) => this._toggleFavorite(dir),
                        onStart: this._onStartServer,
                        onStop: this._onStopServer,
                        onOpenBrowser: this._onOpenBrowser,
                        onViewLogs: this._onViewLogs,
                        onSetPhpVersion: this._onSetPhpVersion,
                        customActions: this._customActions,
                        onCustomAction: (action: CustomActionDescriptor, dir: string) =>
                            this._onCustomAction(action.id, dir),
                    });
                    this._serverSection.addMenuItem(item as any);
                    this._serverItemMap.set(server.directory, item);
                } else {
                    const rowParams: ServerRowItemParams = {
                        directory: server.directory,
                        name,
                        port,
                        isRunning: server.isRunning,
                        isFavorite: false,
                        phpVersion: server.phpVersion ?? null,
                        onStart: this._onStartServer,
                        onStop: this._onStopServer,
                        onOpenBrowser: this._onOpenBrowser,
                        onToggleFavorite: (dir: string) => this._toggleFavorite(dir),
                        onViewLogs: this._onViewLogs,
                        onSetPhpVersion: this._onSetPhpVersion,
                        customActions: this._customActions,
                        onCustomAction: (action, dir) => this._onCustomAction(action.id, dir),
                    };
                    // @ts-ignore - GObject subclass constructor type mismatch in @girs
                    const item = new ServerRowItem(rowParams);
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

        updateServerItem(directory: string, state: { isRunning: boolean; port: string }): void {
            const item = this._serverItemMap.get(directory);
            if (!item) return;
            item.updateStatus(state.isRunning);
            item.updatePort(state.port);
        }

        updateServerPhpVersion(directory: string, version: string | null): void {
            const item = this._serverItemMap.get(directory);
            if (!item) return;
            item.updatePhpVersion(version);
        }

        updateProxyStatus(status: ProxyStatus): void {
            this._proxyItem.updateStatus(status.isRunning, status.proxies);
        }

        /**
         * Shows `message` instead of the server and proxy sections, or clears it
         * when `null` is passed. The wording is decided by the extension, which
         * is the side that knows what went wrong.
         */
        updateStatusMessage(message: string | null): void {
            const healthy = message === null;

            this._statusItem.visible = !healthy;
            if (message !== null) {
                this._statusItem.label.text = message;
            }

            // Hiding a submenu item on its own leaves it expanded for when it comes
            // back, arrow and all.
            if (!healthy) {
                this._otherServersGroup.setSubmenuShown(false);
                this._proxyItem.setSubmenuShown(false);
            }

            this._otherServersGroup.visible = healthy;
            this._proxyItem.visible = healthy;
        }
    }
);

export type IndicatorType = InstanceType<typeof Indicator>;
