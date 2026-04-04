import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import { PopupMenuItem, PopupSeparatorMenuItem } from 'resource:///org/gnome/shell/ui/popupMenu.js';

const RUNNING_COLOR = '#4ade80';
const STOPPED_COLOR = '#888888';

export interface ServerMenuItemParams {
    name: string;
    port: string;
    isRunning: boolean;
    /** When true, the submenu includes an "Add to favorites" action. */
    isFavorite: boolean;
}

const ServerMenuItem = GObject.registerClass(
    class ServerMenuItem extends PopupMenu.PopupSubMenuMenuItem {
        declare _dot: InstanceType<typeof St.Label>;
        declare _portLabel: InstanceType<typeof St.Label> | null;
        declare _isRunning: boolean;
        declare _isFavorite: boolean;

        _init(params: ServerMenuItemParams) {
            super._init(params.name);
            this.label.set_x_expand(true);

            this._isRunning = params.isRunning;
            this._isFavorite = params.isFavorite;
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
            this._rebuildActions();
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
                this.menu.addMenuItem(new PopupMenuItem('⏹️ Stop server'));
                this.menu.addMenuItem(new PopupMenuItem('🌐 Open in browser'));
            } else {
                this.menu.addMenuItem(new PopupMenuItem('▶️ Start server'));
            }

            this.menu.addMenuItem(new PopupSeparatorMenuItem());
            this.menu.addMenuItem(new PopupMenuItem('📋 Copy URL'));
            this.menu.addMenuItem(new PopupMenuItem('📄 View logs'));

            if (this._isFavorite) {
                this.menu.addMenuItem(new PopupSeparatorMenuItem());
                this.menu.addMenuItem(new PopupMenuItem('⭐ Add to favorites'));
            }
        }
    }
);

export { ServerMenuItem };
export type ServerMenuItemType = InstanceType<typeof ServerMenuItem>;
