import St from 'gi://St';
import { PopupBaseMenuItem } from 'resource:///org/gnome/shell/ui/popupMenu.js';

/**
 * Returns a non-interactive, visually distinct section divider row.
 * The label text is uppercased unconditionally.
 */
export function createSectionHeader(text: string): InstanceType<typeof PopupBaseMenuItem> {
    const header = new PopupBaseMenuItem({ reactive: false });
    const label = new St.Label({
        text: text.toUpperCase(),
        style: 'font-size: 11px; font-weight: bold; color: rgba(255, 255, 255, 0.4); padding-top: 5px; padding-bottom: 2px;',
    });
    label.clutter_text.ellipsize = 0;
    header.add_child(label);
    return header;
}
