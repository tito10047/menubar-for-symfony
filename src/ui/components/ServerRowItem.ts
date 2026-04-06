import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

const RUNNING_COLOR = '#4ade80';
const STOPPED_COLOR = '#888888';

export interface ServerRowItemParams {
    directory: string;
    name: string;
    port: string;
    isRunning: boolean;
    isFavorite: boolean;
    onStart: (directory: string) => void;
    onStop: (directory: string) => void;
    onOpenBrowser: (directory: string) => void;
    onToggleFavorite: (directory: string) => void;
}

const ServerRowItem = GObject.registerClass(
    class ServerRowItem extends PopupMenu.PopupBaseMenuItem {
        declare _dot: InstanceType<typeof St.Icon>;
        declare _portLabel: InstanceType<typeof St.Label>;
        declare _startStopBtn: InstanceType<typeof St.Button>;
        declare _browserBtn: InstanceType<typeof St.Button>;
        declare _favoriteBtn: InstanceType<typeof St.Button>;
        declare _isRunning: boolean;
        declare _isFavorite: boolean;
        declare _directory: string;
        declare _onStart: (directory: string) => void;
        declare _onStop: (directory: string) => void;
        declare _onOpenBrowser: (directory: string) => void;
        declare _onToggleFavorite: (directory: string) => void;

        _init(params: ServerRowItemParams) {
            super._init({ reactive: false });

            this._directory = params.directory;
            this._isRunning = params.isRunning;
            this._isFavorite = params.isFavorite;
            this._onStart = params.onStart;
            this._onStop = params.onStop;
            this._onOpenBrowser = params.onOpenBrowser;
            this._onToggleFavorite = params.onToggleFavorite;

            // Status dot
            this._dot = new St.Icon({
                icon_name: 'media-record-symbolic',
                icon_size: 10,
                style: `color: ${params.isRunning ? RUNNING_COLOR : STOPPED_COLOR}; margin-right: 4px;`,
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
                style: 'color: rgba(255, 255, 255, 0.4); font-size: 12px; margin-right: 8px;',
                y_align: Clutter.ActorAlign.CENTER,
                visible: !!params.port,
            });

            // Action buttons
            this._startStopBtn = this._makeIconButton(
                params.isRunning ? 'media-playback-stop-symbolic' : 'media-playback-start-symbolic'
            );
            this._browserBtn = this._makeIconButton('web-browser-symbolic');
            this._browserBtn.visible = params.isRunning;
            this._favoriteBtn = this._makeIconButton(
                params.isFavorite ? 'starred-symbolic' : 'non-starred-symbolic'
            );

            const buttonBox = new St.BoxLayout({
                y_align: Clutter.ActorAlign.CENTER,
            });
            buttonBox.add_child(this._startStopBtn);
            buttonBox.add_child(this._browserBtn);
            buttonBox.add_child(this._favoriteBtn);

            this.add_child(this._dot);
            this.add_child(nameLabel);
            this.add_child(this._portLabel);
            this.add_child(buttonBox);

            this._connectSignals();
        }

        updateStatus(isRunning: boolean): void {
            this._isRunning = isRunning;
            this._dot.set_style(`color: ${isRunning ? RUNNING_COLOR : STOPPED_COLOR};`);
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
                style: 'color: rgba(255,255,255,0.7);',
            });
            return new St.Button({
                child: icon,
                style: 'padding: 2px 4px; background: transparent; border: none;',
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

            this._favoriteBtn.connect('clicked', () => {
                this._onToggleFavorite(this._directory);
            });
        }
    }
);

export { ServerRowItem };
export type ServerRowItemType = InstanceType<typeof ServerRowItem>;
