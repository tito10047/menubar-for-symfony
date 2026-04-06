import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import { PopupBaseMenuItem } from 'resource:///org/gnome/shell/ui/popupMenu.js';
import { PhpInfo, PhpExtensionStatus } from '../../core/dto/PhpInfo.js';

const BADGE_STYLE_ENABLED =
    'font-size: 10px; ' +
    'background-color: rgba(74, 222, 128, 0.20); ' +
    'color: #4ade80; ' +
    'padding: 2px 6px; border-radius: 4px; margin-right: 8px;';

const BADGE_STYLE_INSTALLED =
    'font-size: 10px; ' +
    'background-color: rgba(255,255,255,0.06); ' +
    'color: rgba(255,255,255,0.35); ' +
    'padding: 2px 6px; border-radius: 4px; margin-right: 8px;';

interface PhpVersionItemParams {
    version?: string;
    isActive?: boolean;
    info?: PhpInfo;
}

const PhpVersionItem = GObject.registerClass(
    class PhpVersionItem extends PopupBaseMenuItem {
        declare _dot: InstanceType<typeof St.Icon>;
        declare _versionLabel: InstanceType<typeof St.Label>;
        declare _badgeContainer: InstanceType<typeof St.BoxLayout>;

        _init(params: PhpVersionItemParams = {}) {
            super._init({ reactive: false });

            const box = new St.BoxLayout({
                x_expand: true,
                y_align: Clutter.ActorAlign.CENTER,
            });

            this._dot = new St.Icon({
                icon_name: 'media-record-symbolic',
                icon_size: 10,
                style: 'color: #888888; margin-right: 6px;',
            });

            this._versionLabel = new St.Label({ text: '—' });
            this._versionLabel.set_x_expand(true);

            this._badgeContainer = new St.BoxLayout({});

            box.add_child(this._dot);
            box.add_child(this._versionLabel);
            box.add_child(this._badgeContainer);
            this.add_child(box);

            if (params.version) this.updateVersion(params.version);
            if (params.isActive !== undefined) this.updateStatus(params.isActive);
            if (params.info) this.updateBadges(params.info);
        }

        updateVersion(version: string): void {
            this._versionLabel.set_text(version);
        }

        updateStatus(isActive: boolean): void {
            this._dot.set_style(`color: ${isActive ? '#4ade80' : '#888888'};`);
        }

        /**
         * Destroys all existing badge actors and re-populates from PhpInfo.
         * - ENABLED extensions get a green badge
         * - INSTALLED (but not enabled) extensions get a muted badge
         * - NOT_INSTALLED extensions produce no badge
         */
        updateBadges(info: PhpInfo): void {
            this._badgeContainer.destroy_all_children();

            const entries: [PhpExtensionStatus, string][] = [
                [info.opcache, 'OPcache'],
                [info.xdebug,  'Xdebug'],
                [info.apcu,    'APCu'],
            ];

            for (const [status, label] of entries) {
                const badge = this._makeBadge(label, status);
                if (badge) this._badgeContainer.add_child(badge);
            }
        }

        private _makeBadge(label: string, status: PhpExtensionStatus): InstanceType<typeof St.Label> | null {
            if (status === PhpExtensionStatus.ENABLED) {
                return new St.Label({ text: label, style: BADGE_STYLE_ENABLED });
            }
            if (status === PhpExtensionStatus.INSTALLED) {
                return new St.Label({ text: label, style: BADGE_STYLE_INSTALLED });
            }
            return null;
        }
    }
);

export { PhpVersionItem };
export type PhpVersionItemType = InstanceType<typeof PhpVersionItem>;
