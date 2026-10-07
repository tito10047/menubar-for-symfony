import Gio from 'gi://Gio';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import { ModalDialog } from 'resource:///org/gnome/shell/ui/modalDialog.js';
import { MessageDialogContent } from 'resource:///org/gnome/shell/ui/dialog.js';
import { StatusDialogContent } from '../statusPresentation.js';

/**
 * Explains what is missing and where to get it.
 *
 * Purely presentational: the wording arrives already decided in
 * `statusPresentation.ts`. Links open in the browser and leave the dialog
 * standing, so the user can install the helper and then reach for the refresh
 * icon in the menu.
 */
export function openStatusDialog(content: StatusDialogContent): void {
    const dialog = new ModalDialog({ destroyOnClose: true });

    dialog.contentLayout.add_child(new MessageDialogContent({
        title: content.title,
        description: content.description,
    }));

    if (content.steps !== undefined && content.steps.length > 0) {
        const steps = new St.Label({
            text: content.steps.join('\n'),
            style_class: 'status-dialog-steps',
        });
        steps.clutter_text.line_wrap = false;
        dialog.contentLayout.add_child(steps);
    }

    if (content.footer !== undefined) {
        const footer = new St.Label({
            text: content.footer,
            style_class: 'status-dialog-footer',
        });
        footer.clutter_text.line_wrap = true;
        dialog.contentLayout.add_child(footer);
    }

    for (const link of content.links) {
        const button = new St.Button({
            label: `${link.label} →`,
            style_class: 'status-dialog-link',
            can_focus: true,
            x_align: Clutter.ActorAlign.START,
        });
        button.connect('clicked', () => {
            Gio.AppInfo.launch_default_for_uri(link.url, null);
        });
        dialog.contentLayout.add_child(button);
    }

    dialog.setButtons([
        {
            label: 'Close',
            default: true,
            action: () => dialog.close(),
        },
    ]);

    dialog.open();
}
