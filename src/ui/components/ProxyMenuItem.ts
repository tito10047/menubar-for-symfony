import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import { PopupImageMenuItem } from 'resource:///org/gnome/shell/ui/popupMenu.js';

const RUNNING_COLOR = '#4ade80';
const STOPPED_COLOR = '#888888';

const ProxyMenuItem = GObject.registerClass(
    class ProxyMenuItem extends PopupMenu.PopupSubMenuMenuItem {
        declare _dot: InstanceType<typeof St.Icon>;
        declare _startItem: InstanceType<typeof PopupImageMenuItem>;
        declare _stopItem: InstanceType<typeof PopupImageMenuItem>;
        declare _restartItem: InstanceType<typeof PopupImageMenuItem>;
        declare _openBrowserItem: InstanceType<typeof PopupImageMenuItem>;

        _init() {
            super._init('Proxy: stopped');

            // Status dot — inserted directly before the label.
            this._dot = new St.Icon({
                icon_name: 'media-record-symbolic',
                icon_size: 10,
                style: `color: ${STOPPED_COLOR}; margin-right: 6px;`,
                y_align: Clutter.ActorAlign.CENTER,
            });
            const labelIdx = this.get_children().indexOf(this.label);
            this.insert_child_at_index(this._dot, labelIdx !== -1 ? labelIdx : 1);

            this._startItem       = new PopupImageMenuItem('Start', 'media-playback-start-symbolic');
            this._stopItem        = new PopupImageMenuItem('Stop', 'media-playback-stop-symbolic');
            this._restartItem     = new PopupImageMenuItem('Restart', 'view-refresh-symbolic');
            this._openBrowserItem = new PopupImageMenuItem('Open in browser', 'web-browser-symbolic');

            this.menu.addMenuItem(this._startItem);
            this.menu.addMenuItem(this._stopItem);
            this.menu.addMenuItem(this._restartItem);
            this.menu.addMenuItem(this._openBrowserItem);
        }

        /**
         * Updates dot color, label text, and action visibility to reflect
         * the current proxy running state.
         *
         * @param isRunning - Whether the proxy process is active.
         * @param port      - Optional port number shown in the label when running.
         */
        updateStatus(isRunning: boolean, port?: number): void {
            this._dot.set_style(`color: ${isRunning ? RUNNING_COLOR : STOPPED_COLOR};`);

            const labelText = isRunning
                ? `Proxy running${port !== undefined ? `: port ${port}` : ''}`
                : 'Proxy: stopped';
            this.label.set_text(labelText);

            this._startItem.visible   = !isRunning;
            this._stopItem.visible    = isRunning;
            this._restartItem.visible = isRunning;
        }

        updateLabel(text: string): void {
            this.label.set_text(text);
        }
    }
);

export { ProxyMenuItem };
export type ProxyMenuItemType = InstanceType<typeof ProxyMenuItem>;
