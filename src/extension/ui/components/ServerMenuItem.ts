import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import { PopupImageMenuItem, PopupMenuSection, PopupSeparatorMenuItem } from 'resource:///org/gnome/shell/ui/popupMenu.js';
import { ServerItemInterface } from './ServerItemInterface.js';
import { CustomActionDescriptor } from '../../../shared/dto/CustomActionDescriptor.js';
import { sameCustomActions } from '../serverMenuState.js';

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
    customActions?: CustomActionDescriptor[];
    onCustomAction?: (action: CustomActionDescriptor, directory: string) => void;
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
        declare _customActions: CustomActionDescriptor[];
        declare _onCustomAction: ((action: CustomActionDescriptor, directory: string) => void) | undefined;
        declare _startItem: InstanceType<typeof PopupImageMenuItem>;
        declare _stopItem: InstanceType<typeof PopupImageMenuItem>;
        declare _browserItem: InstanceType<typeof PopupImageMenuItem>;
        declare _phpItem: InstanceType<typeof PopupImageMenuItem>;
        declare _customActionsSection: InstanceType<typeof PopupMenuSection>;
        declare _pendingCustomActions: CustomActionDescriptor[] | null;

        // @ts-ignore - GObject._init overload signature mismatch in @girs types
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
            this._pendingCustomActions = null;

            // Status dot — inserted directly before the name label.
            this._dot = new St.Icon({
                icon_name: 'media-record-symbolic',
                icon_size: 10,
                style_class: 'server-status-dot stopped',
                y_align: Clutter.ActorAlign.CENTER,
            });
            const labelIndex = this.get_children().indexOf(this.label);
            this.insert_child_at_index(this._dot, labelIndex !== -1 ? labelIndex : 1);

            this._buildActions();
            this._applyDotColor(params.isRunning);
            this._setPort(params.port);

            // A changed action list has to wait for the submenu to close: emptying
            // and refilling an open submenu makes it collapse under the pointer.
            this.menu.connect('open-state-changed', (_menu, open) => {
                if (!open) this._flushPendingCustomActions();
                return undefined;
            });
        }

        updateStatus(isRunning: boolean): void {
            this._isRunning = isRunning;
            this._applyDotColor(isRunning);

            // Visibility only — the submenu items are never rebuilt, so this is
            // safe while the user has the submenu open.
            this._startItem.visible = !isRunning;
            this._stopItem.visible = isRunning;
            this._browserItem.visible = isRunning;
        }

        updatePort(port: string): void {
            this._setPort(port);
        }

        updatePhpVersion(version: string | null): void {
            this._phpVersion = version;
            this._phpItem.label.text = this._phpLabel();
        }

        updateCustomActions(actions: CustomActionDescriptor[]): void {
            if (sameCustomActions(this._customActions, actions)) return;

            if (this.menu.isOpen) {
                this._pendingCustomActions = actions;
                return;
            }
            this._applyCustomActions(actions);
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

        _phpLabel(): string {
            return this._phpVersion ? `PHP: ${this._phpVersion}` : 'PHP: —';
        }

        /**
         * Populates the submenu once. Everything that can change afterwards is a
         * label or a visibility flag, because tearing the submenu down while it is
         * open closes it in the user's face.
         */
        _buildActions(): void {
            this._startItem = new PopupImageMenuItem('Start server', 'media-playback-start-symbolic');
            (this._startItem as any).activate = () => this._onStart?.(this._directory);
            this.menu.addMenuItem(this._startItem);

            this._stopItem = new PopupImageMenuItem('Stop server', 'media-playback-stop-symbolic');
            (this._stopItem as any).activate = () => this._onStop?.(this._directory);
            this.menu.addMenuItem(this._stopItem);

            this._browserItem = new PopupImageMenuItem('Open in browser', 'web-browser-symbolic');
            (this._browserItem as any).activate = () => this._onOpenBrowser?.(this._directory);
            this.menu.addMenuItem(this._browserItem);

            this._startItem.visible = !this._isRunning;
            this._stopItem.visible = this._isRunning;
            this._browserItem.visible = this._isRunning;

            this.menu.addMenuItem(new PopupSeparatorMenuItem());
            this.menu.addMenuItem(new PopupImageMenuItem('Copy URL', 'edit-copy-symbolic'));
            const logsItem = new PopupImageMenuItem('View logs', 'utilities-terminal-symbolic');
            (logsItem as any).activate = () => this._onViewLogs?.(this._directory);
            this.menu.addMenuItem(logsItem);

            this.menu.addMenuItem(new PopupSeparatorMenuItem());

            this._phpItem = new PopupImageMenuItem(this._phpLabel(), 'preferences-system-symbolic');
            (this._phpItem as any).activate = () => this._onSetPhpVersion?.(this._directory);
            this.menu.addMenuItem(this._phpItem);

            this.menu.addMenuItem(new PopupSeparatorMenuItem());
            const favIcon = this._isFavorite ? 'starred-symbolic' : 'non-starred-symbolic';
            const favLabel = this._isFavorite ? 'Remove from favorites' : 'Add to favorites';
            const favItem = new PopupImageMenuItem(favLabel, favIcon);
            (favItem as any).activate = () => this._onToggleFavorite?.(this._directory);
            this.menu.addMenuItem(favItem);

            // Kept in its own section so a changed action list never disturbs the
            // items above it. The divider belongs to the submenu rather than to the
            // section: GNOME hides a separator that leads a menu, and shows or
            // hides this one for us depending on whether the section is empty.
            this.menu.addMenuItem(new PopupSeparatorMenuItem());
            this._customActionsSection = new PopupMenuSection();
            this.menu.addMenuItem(this._customActionsSection);
            this._fillCustomActionsSection();
        }

        _flushPendingCustomActions(): void {
            const pending = this._pendingCustomActions;
            if (pending === null) return;

            this._pendingCustomActions = null;
            this._applyCustomActions(pending);
        }

        _applyCustomActions(actions: CustomActionDescriptor[]): void {
            this._customActions = actions;
            this._customActionsSection.removeAll();
            this._fillCustomActionsSection();
        }

        _fillCustomActionsSection(): void {
            for (const action of this._customActions) {
                const actionItem = new PopupImageMenuItem(action.name, action.icon ?? 'system-run-symbolic');
                (actionItem as any).activate = () => this._onCustomAction?.(action, this._directory);
                this._customActionsSection.addMenuItem(actionItem);
            }
        }
    }
);

export { ServerMenuItem };
export type ServerMenuItemType = InstanceType<typeof ServerMenuItem>;
