import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import { ServerItemInterface } from './ServerItemInterface.js';

export interface ServerRowItemParams {
    directory: string;
    name: string;
    port: string;
    isRunning: boolean;
    isFavorite: boolean;
    phpVersion?: string | null;
    onStart: (directory: string) => void;
    onStop: (directory: string) => void;
    onOpenBrowser: (directory: string) => void;
    onToggleFavorite: (directory: string) => void;
    onViewLogs: (directory: string) => void;
    onSetPhpVersion?: (directory: string) => void;
}

const ServerRowItem = GObject.registerClass(
    class ServerRowItem extends PopupMenu.PopupBaseMenuItem implements ServerItemInterface {
        declare _dot: InstanceType<typeof St.Icon>;
        declare _portLabel: InstanceType<typeof St.Label>;
        declare _startStopBtn: InstanceType<typeof St.Button>;
        declare _browserBtn: InstanceType<typeof St.Button>;
        declare _logsBtn: InstanceType<typeof St.Button>;
        declare _favoriteBtn: InstanceType<typeof St.Button>;
        declare _phpVersionBtn: InstanceType<typeof St.Button>;
        declare _isRunning: boolean;
        declare _isFavorite: boolean;
        declare _directory: string;
        declare _onStart: (directory: string) => void;
        declare _onStop: (directory: string) => void;
        declare _onOpenBrowser: (directory: string) => void;
        declare _onToggleFavorite: (directory: string) => void;
        declare _onViewLogs: (directory: string) => void;
        declare _onSetPhpVersion: ((directory: string) => void) | undefined;

        _init(params: ServerRowItemParams) {
            super._init({ reactive: false });

            this._directory = params.directory;
            this._isRunning = params.isRunning;
            this._isFavorite = params.isFavorite;
            this._onStart = params.onStart;
            this._onStop = params.onStop;
            this._onOpenBrowser = params.onOpenBrowser;
            this._onToggleFavorite = params.onToggleFavorite;
            this._onViewLogs = params.onViewLogs;
            this._onSetPhpVersion = params.onSetPhpVersion;

            // Status dot
            this._dot = new St.Icon({
                icon_name: 'media-record-symbolic',
                icon_size: 10,
                style_class: `server-status-dot ${params.isRunning ? 'running' : 'stopped'}`,
                y_align: Clutter.ActorAlign.CENTER,
            });

            // Server name — expands to push buttons right
            const nameLabel = new St.Label({
                text: params.name,
                x_expand: true,
                y_align: Clutter.ActorAlign.CENTER,
            });

            // Port label — hidden when empty
            this._portLabel = new St.Label({
                text: params.port ? `:${params.port}` : '',
                style_class: 'server-port-label',
                y_align: Clutter.ActorAlign.CENTER,
                visible: !!params.port,
            });

            // PHP version button
            this._phpVersionBtn = new St.Button({
                label: params.phpVersion ? params.phpVersion : '—',
                style_class: 'php-version-button',
                can_focus: true,
                y_align: Clutter.ActorAlign.CENTER,
            });

            // Action buttons
            this._startStopBtn = this._makeIconButton(
                params.isRunning ? 'media-playback-stop-symbolic' : 'media-playback-start-symbolic'
            );
            this._browserBtn = this._makeIconButton('web-browser-symbolic');
            this._browserBtn.visible = params.isRunning;
            this._logsBtn = this._makeIconButton('utilities-terminal-symbolic');
            this._favoriteBtn = this._makeIconButton(
                params.isFavorite ? 'starred-symbolic' : 'non-starred-symbolic'
            );

            const buttonBox = new St.BoxLayout({
                y_align: Clutter.ActorAlign.CENTER,
            });
            buttonBox.add_child(this._startStopBtn);
            buttonBox.add_child(this._browserBtn);
            buttonBox.add_child(this._logsBtn);
            buttonBox.add_child(this._favoriteBtn);

            this.add_child(this._dot);
            this.add_child(nameLabel);
            this.add_child(this._portLabel);
            this.add_child(this._phpVersionBtn);
            this.add_child(buttonBox);

            this._connectSignals();
        }

        updateStatus(isRunning: boolean): void {
            this._isRunning = isRunning;
            this._dot.remove_style_class_name(isRunning ? 'stopped' : 'running');
            this._dot.add_style_class_name(isRunning ? 'running' : 'stopped');
            this._startStopBtn
                .get_child()
                ?.set_icon_name(
                    isRunning ? 'media-playback-stop-symbolic' : 'media-playback-start-symbolic'
                );
            this._browserBtn.visible = isRunning;
        }

        updatePort(port: string): void {
            this._portLabel.set_text(port ? `:${port}` : '');
            this._portLabel.visible = !!port;
        }

        updatePhpVersion(version: string | null): void {
            this._phpVersionBtn.set_label(version ?? '—');
        }

        updateFavorite(isFavorite: boolean): void {
            this._isFavorite = isFavorite;
            this._favoriteBtn
                .get_child()
                ?.set_icon_name(isFavorite ? 'starred-symbolic' : 'non-starred-symbolic');
        }

        // ---- private helpers ----

        _makeIconButton(iconName: string): InstanceType<typeof St.Button> {
            const icon = new St.Icon({
                icon_name: iconName,
                icon_size: 12,
                style_class: 'server-action-icon',
            });
            return new St.Button({
                child: icon,
                style_class: 'server-action-button',
                can_focus: true,
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.CENTER,
            });
        }

        _connectSignals(): void {
            this._startStopBtn.connect('clicked', () => {
                if (this._isRunning) {
                    this._onStop(this._directory);
                } else {
                    this._onStart(this._directory);
                }
            });

            this._browserBtn.connect('clicked', () => {
                this._onOpenBrowser(this._directory);
            });

            this._logsBtn.connect('clicked', () => {
                this._onViewLogs(this._directory);
            });

            this._favoriteBtn.connect('clicked', () => {
                this._onToggleFavorite(this._directory);
            });

            this._phpVersionBtn.connect('clicked', () => {
                this._onSetPhpVersion?.(this._directory);
            });
        }
    }
);

export { ServerRowItem };
export type ServerRowItemType = InstanceType<typeof ServerRowItem>;
