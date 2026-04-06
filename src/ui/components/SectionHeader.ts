import St from 'gi://St';
import Clutter from 'gi://Clutter';
import { PopupBaseMenuItem } from 'resource:///org/gnome/shell/ui/popupMenu.js';

/**
 * Returns a non-interactive, visually distinct section divider row.
 * The label text is uppercased unconditionally.
 * Pass `options.onRefresh` to include a refresh button with hover effect and cursor change.
 */
export function createSectionHeader(
    text: string,
    options?: { onRefresh?: () => void }
): InstanceType<typeof PopupBaseMenuItem> {
    const header = new PopupBaseMenuItem({ reactive: false });
    const label = new St.Label({
        text: text.toUpperCase(),
        style: 'font-size: 11px; font-weight: bold; color: rgba(255, 255, 255, 0.4); padding-top: 5px; padding-bottom: 2px;',
        x_expand: true,
    });
    label.clutter_text.ellipsize = 0;
    header.add_child(label);

    if (options?.onRefresh) {
        const icon = new St.Icon({
            icon_name: 'view-refresh-symbolic',
            icon_size: 14,
            style: 'color: rgba(255,255,255,0.5);',
            y_align: Clutter.ActorAlign.CENTER,
        });
        const btn = new St.Button({
            child: icon,
            reactive: true,
            track_hover: true,
            style: 'padding: 0 4px; background: transparent; border: none;',
        });

        btn.connect('notify::hover', () => {
            icon.set_style(btn.hover
                ? 'color: rgba(255,255,255,0.9);'
                : 'color: rgba(255,255,255,0.5);');
        });

        btn.connect('clicked', options.onRefresh);
        header.add_child(btn);
    }

    return header;
}
