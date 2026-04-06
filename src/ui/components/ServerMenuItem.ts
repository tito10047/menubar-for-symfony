import GObject from 'gi://GObject';
import GLib from 'gi://GLib';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import { PopupMenuItem, PopupSeparatorMenuItem } from 'resource:///org/gnome/shell/ui/popupMenu.js';

const RUNNING_COLOR = '#4ade80';
const STOPPED_COLOR = '#888888';

export interface ServerMenuItemParams {
    directory: string;
    name: string;
    port: string;
    isRunning: boolean;
    isFavorite: boolean;
    onToggleFavorite?: (directory: string) => void;
    onStart?: (directory: string) => void;
    onStop?: (directory: string) => void;
    onOpenBrowser?: (directory: string) => void;
}

const ServerMenuItem = GObject.registerClass(
    class ServerMenuItem extends PopupMenu.PopupSubMenuMenuItem {
        declare _dot: InstanceType<typeof St.Label>;
        declare _portLabel: InstanceType<typeof St.Label> | null;
        declare _isRunning: boolean;
        declare _isFavorite: boolean;
        declare _directory: string;
        declare _onToggleFavorite: ((directory: string) => void) | undefined;
        declare _onStart: ((directory: string) => void) | undefined;
        declare _onStop: ((directory: string) => void) | undefined;
        declare _onOpenBrowser: ((directory: string) => void) | undefined;

        _init(params: ServerMenuItemParams) {
            super._init(params.name);
            this.label.set_x_expand(true);

            this._isRunning = params.isRunning;
            this._isFavorite = params.isFavorite;
            this._directory = params.directory;
            this._onToggleFavorite = params.onToggleFavorite;
            this._onStart = params.onStart;
            this._onStop = params.onStop;
            this._onOpenBrowser = params.onOpenBrowser;
            this._portLabel = null;

            // Status dot — inserted directly before the name label.
            this._dot = new St.Label({
                text: '●  ',
                style: `color: ${STOPPED_COLOR};`,
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

        // ---- private helpers (GObject _ convention) ----

        _applyDotColor(isRunning: boolean): void {
            this._dot.set_style(`color: ${isRunning ? RUNNING_COLOR : STOPPED_COLOR};`);
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
                style: 'color: rgba(255, 255, 255, 0.4); font-size: 12px; margin-right: 8px;',
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
                const stopItem = new PopupMenuItem('⏹️ Stop server');
                stopItem.connect('activate', () => this._onStop?.(this._directory));
                this.menu.addMenuItem(stopItem);

                const browserItem = new PopupMenuItem('🌐 Open in browser');
                browserItem.connect('activate', () => this._onOpenBrowser?.(this._directory));
                this.menu.addMenuItem(browserItem);
            } else {
                const startItem = new PopupMenuItem('▶️ Start server');
                startItem.connect('activate', () => this._onStart?.(this._directory));
                this.menu.addMenuItem(startItem);
            }

            this.menu.addMenuItem(new PopupSeparatorMenuItem());
            this.menu.addMenuItem(new PopupMenuItem('📋 Copy URL'));
            this.menu.addMenuItem(new PopupMenuItem('📄 View logs'));

            this.menu.addMenuItem(new PopupSeparatorMenuItem());
            const label = this._isFavorite ? '⭐ Remove from favorites' : '☆ Add to favorites';
            const favItem = new PopupMenuItem(label);
            favItem.connect('activate', () => this._onToggleFavorite?.(this._directory));
            this.menu.addMenuItem(favItem);
        }
    }
);

export { ServerMenuItem };
export type ServerMenuItemType = InstanceType<typeof ServerMenuItem>;
