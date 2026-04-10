import GObject from 'gi://GObject';
import GLib from 'gi://GLib';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import { PopupMenuItem, PopupImageMenuItem, PopupSeparatorMenuItem } from 'resource:///org/gnome/shell/ui/popupMenu.js';
import { ServerItemInterface } from './ServerItemInterface.js';
import { CustomAction } from '../../core/dto/CustomAction.js';

export interface ServerMenuItemParams {
    directory: string;
    name: string;
    port: string;
    isRunning: boolean;
    isFavorite: boolean;
    phpVersion?: string | null;
    onToggleFavorite?: (directory: string) => void;
    onStart?: (directory: string) => void;
    onStop?: (directory: string) => void;
    onOpenBrowser?: (directory: string) => void;
    onViewLogs?: (directory: string) => void;
    onSetPhpVersion?: (directory: string) => void;
    customActions?: CustomAction[];
    onCustomAction?: (action: CustomAction, directory: string) => void;
}

const ServerMenuItem = GObject.registerClass(
    class ServerMenuItem extends PopupMenu.PopupSubMenuMenuItem implements ServerItemInterface {
        declare _dot: InstanceType<typeof St.Icon>;
        declare _portLabel: InstanceType<typeof St.Label> | null;
        declare _isRunning: boolean;
        declare _isFavorite: boolean;
        declare _directory: string;
        declare _phpVersion: string | null;
        declare _onToggleFavorite: ((directory: string) => void) | undefined;
        declare _onStart: ((directory: string) => void) | undefined;
        declare _onStop: ((directory: string) => void) | undefined;
        declare _onOpenBrowser: ((directory: string) => void) | undefined;
        declare _onViewLogs: ((directory: string) => void) | undefined;
        declare _onSetPhpVersion: ((directory: string) => void) | undefined;
        declare _customActions: CustomAction[];
        declare _onCustomAction: ((action: CustomAction, directory: string) => void) | undefined;

        _init(params: ServerMenuItemParams) {
            super._init(params.name);
            this.label.set_x_expand(true);

            this._isRunning = params.isRunning;
            this._isFavorite = params.isFavorite;
            this._directory = params.directory;
            this._phpVersion = params.phpVersion ?? null;
            this._onToggleFavorite = params.onToggleFavorite;
            this._onStart = params.onStart;
            this._onStop = params.onStop;
            this._onOpenBrowser = params.onOpenBrowser;
            this._onViewLogs = params.onViewLogs;
            this._onSetPhpVersion = params.onSetPhpVersion;
            this._customActions = params.customActions ?? [];
            this._onCustomAction = params.onCustomAction;
            this._portLabel = null;

            // Status dot — inserted directly before the name label.
            this._dot = new St.Icon({
                icon_name: 'media-record-symbolic',
                icon_size: 10,
                style_class: 'server-status-dot stopped',
                y_align: Clutter.ActorAlign.CENTER,
            });
            const labelIndex = this.get_children().indexOf(this.label);
            this.insert_child_at_index(this._dot, labelIndex !== -1 ? labelIndex : 1);

            this._applyDotColor(params.isRunning);
            this._setPort(params.port);
            this._rebuildActions();
        }

        updateStatus(isRunning: boolean): void {
            this._isRunning = isRunning;
            this._applyDotColor(isRunning);
            GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
                this._rebuildActions();
                return GLib.SOURCE_REMOVE;
            });
        }

        updatePort(port: string): void {
            this._setPort(port);
        }

        updatePhpVersion(version: string | null): void {
            this._phpVersion = version;
            GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
                this._rebuildActions();
                return GLib.SOURCE_REMOVE;
            });
        }

        // ---- private helpers (GObject _ convention) ----

        _applyDotColor(isRunning: boolean): void {
            this._dot.remove_style_class_name(isRunning ? 'stopped' : 'running');
            this._dot.add_style_class_name(isRunning ? 'running' : 'stopped');
        }

        /**
         * Destroys the existing port actor (if any) and inserts a new one
         * just before the expand-arrow (last child).
         */
        _setPort(port: string): void {
            if (this._portLabel) {
                this._portLabel.destroy();
                this._portLabel = null;
            }

            if (!port) return;

            this._portLabel = new St.Label({
                text: `:${port}`,
                style_class: 'server-port-label',
                y_align: Clutter.ActorAlign.CENTER,
            });
            // Insert before the expand-arrow, which is always the last child.
            const childrenCount = this.get_children().length;
            this.insert_child_at_index(this._portLabel, childrenCount - 1);
        }

        /**
         * Clears and re-populates the submenu based on current running state.
         * Called on construction and on every status change.
         */
        _rebuildActions(): void {
            this.menu.removeAll();

            if (this._isRunning) {
                const stopItem = new PopupImageMenuItem('Stop server', 'media-playback-stop-symbolic');
                (stopItem as any).activate = () => this._onStop?.(this._directory);
                this.menu.addMenuItem(stopItem);

                const browserItem = new PopupImageMenuItem('Open in browser', 'web-browser-symbolic');
                (browserItem as any).activate = () => this._onOpenBrowser?.(this._directory);
                this.menu.addMenuItem(browserItem);
            } else {
                const startItem = new PopupImageMenuItem('Start server', 'media-playback-start-symbolic');
                (startItem as any).activate = () => this._onStart?.(this._directory);
                this.menu.addMenuItem(startItem);
            }

            this.menu.addMenuItem(new PopupSeparatorMenuItem());
            this.menu.addMenuItem(new PopupImageMenuItem('Copy URL', 'edit-copy-symbolic'));
            const logsItem = new PopupImageMenuItem('View logs', 'utilities-terminal-symbolic');
            (logsItem as any).activate = () => this._onViewLogs?.(this._directory);
            this.menu.addMenuItem(logsItem);

            this.menu.addMenuItem(new PopupSeparatorMenuItem());

            const phpLabel = this._phpVersion ? `PHP: ${this._phpVersion}` : 'PHP: —';
            const phpItem = new PopupImageMenuItem(phpLabel, 'preferences-system-symbolic');
            (phpItem as any).activate = () => this._onSetPhpVersion?.(this._directory);
            this.menu.addMenuItem(phpItem);

            this.menu.addMenuItem(new PopupSeparatorMenuItem());
            const favIcon = this._isFavorite ? 'starred-symbolic' : 'non-starred-symbolic';
            const favLabel = this._isFavorite ? 'Remove from favorites' : 'Add to favorites';
            const favItem = new PopupImageMenuItem(favLabel, favIcon);
            (favItem as any).activate = () => this._onToggleFavorite?.(this._directory);
            this.menu.addMenuItem(favItem);

            if (this._customActions.length > 0) {
                this.menu.addMenuItem(new PopupSeparatorMenuItem());
                for (const action of this._customActions) {
                    const actionItem = new PopupImageMenuItem(action.name, action.icon ?? 'system-run-symbolic');
                    (actionItem as any).activate = () => this._onCustomAction?.(action, this._directory);
                    this.menu.addMenuItem(actionItem);
                }
            }
        }
    }
);

export { ServerMenuItem };
export type ServerMenuItemType = InstanceType<typeof ServerMenuItem>;
