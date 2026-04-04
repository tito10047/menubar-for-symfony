import GObject from 'gi://GObject';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import { ServerMenuItem, ServerMenuItemParams, ServerMenuItemType } from './ServerMenuItem.js';

const FavoriteServersGroup = GObject.registerClass(
    class FavoriteServersGroup extends PopupMenu.PopupSubMenuMenuItem {
        declare _serverMap: Map<string, ServerMenuItemType>;

        _init() {
            super._init('📁 Other favorite servers');
            this._serverMap = new Map();
        }

        /**
         * Creates a new ServerMenuItem, registers it under `directory` as the
         * canonical key (matches SymfonyServer.directory), and appends it to the submenu.
         */
        addServer(directory: string, params: ServerMenuItemParams): void {
            const item = new ServerMenuItem(params);
            this._serverMap.set(directory, item);
            this.menu.addMenuItem(item);
        }

        getServer(directory: string): ServerMenuItemType | undefined {
            return this._serverMap.get(directory);
        }

        /** Destroys all child items and clears the internal map. */
        clear(): void {
            this.menu.removeAll();
            this._serverMap.clear();
        }

        get serverCount(): number {
            return this._serverMap.size;
        }
    }
);

export { FavoriteServersGroup };
export type FavoriteServersGroupType = InstanceType<typeof FavoriteServersGroup>;
