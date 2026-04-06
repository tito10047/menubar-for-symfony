import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import { PopupImageMenuItem } from 'resource:///org/gnome/shell/ui/popupMenu.js';

import { SymfonyProxy } from '../../core/dto/ProxyStatus.js';

interface ProxyMenuItemParams {
    onStart: () => void;
    onStop: () => void;
    onRestart: () => void;
    onOpenBrowser: () => void;
}

const ProxyMenuItem = GObject.registerClass(
    class ProxyMenuItem extends PopupMenu.PopupSubMenuMenuItem {
        declare _dot: InstanceType<typeof St.Icon>;
        declare _startItem: InstanceType<typeof PopupImageMenuItem>;
        declare _stopItem: InstanceType<typeof PopupImageMenuItem>;
        declare _restartItem: InstanceType<typeof PopupImageMenuItem>;
        declare _openBrowserItem: InstanceType<typeof PopupImageMenuItem>;

        _init(params: ProxyMenuItemParams) {
            super._init('Proxy: stopped');

            // Status dot — inserted directly before the label.
            this._dot = new St.Icon({
                icon_name: 'media-record-symbolic',
                icon_size: 10,
                style_class: 'server-status-dot stopped',
                y_align: Clutter.ActorAlign.CENTER,
            });
            const labelIdx = this.get_children().indexOf(this.label);
            this.insert_child_at_index(this._dot, labelIdx !== -1 ? labelIdx : 1);

            this._startItem       = new PopupImageMenuItem('Start', 'media-playback-start-symbolic');
            this._stopItem        = new PopupImageMenuItem('Stop', 'media-playback-stop-symbolic');
            this._restartItem     = new PopupImageMenuItem('Restart', 'view-refresh-symbolic');
            this._openBrowserItem = new PopupImageMenuItem('Open in browser', 'web-browser-symbolic');

            this._startItem.connect('activate', () => params.onStart());
            this._stopItem.connect('activate', () => params.onStop());
            this._restartItem.connect('activate', () => params.onRestart());
            this._openBrowserItem.connect('activate', () => params.onOpenBrowser());

            this.menu.addMenuItem(this._startItem);
            this.menu.addMenuItem(this._stopItem);
            this.menu.addMenuItem(this._restartItem);
            this.menu.addMenuItem(this._openBrowserItem);

            // Initial state: stopped
            this._stopItem.visible        = false;
            this._restartItem.visible     = false;
            this._openBrowserItem.visible = false;
        }

        /**
         * Updates dot color, label, and action visibility.
         */
        updateStatus(isRunning: boolean, _proxies: SymfonyProxy[]): void {
            this._dot.remove_style_class_name(isRunning ? 'stopped' : 'running');
            this._dot.add_style_class_name(isRunning ? 'running' : 'stopped');
            this.label.set_text(isRunning ? 'Proxy' : 'Proxy');

            this._startItem.visible       = !isRunning;
            this._stopItem.visible        = isRunning;
            this._restartItem.visible     = isRunning;
            this._openBrowserItem.visible = isRunning;
        }
    }
);

export { ProxyMenuItem };
export type ProxyMenuItemType = InstanceType<typeof ProxyMenuItem>;
