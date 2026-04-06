import St from 'gi://St';
import Clutter from 'gi://Clutter';
import { PopupBaseMenuItem } from 'resource:///org/gnome/shell/ui/popupMenu.js';

/**
 * Returns a non-interactive, visually distinct section divider row.
 * The label text is uppercased unconditionally.
 * Pass `options.onRefresh` to include a refresh button; hover effect is handled via CSS.
 */
export function createSectionHeader(
    text: string,
    options?: { onRefresh?: () => void }
): InstanceType<typeof PopupBaseMenuItem> {
    const header = new PopupBaseMenuItem({ reactive: false });
    const label = new St.Label({
        text: text.toUpperCase(),
        style_class: 'section-header-label',
        x_expand: true,
    });
    label.clutter_text.ellipsize = 0;
    header.add_child(label);

    if (options?.onRefresh) {
        const icon = new St.Icon({
            icon_name: 'view-refresh-symbolic',
            icon_size: 14,
            style_class: 'section-header-icon',
            y_align: Clutter.ActorAlign.CENTER,
        });
        const btn = new St.Button({
            child: icon,
            reactive: true,
            track_hover: true,
            style_class: 'section-header-button',
        });

        btn.connect('clicked', options.onRefresh);
        header.add_child(btn);
    }

    return header;
}
