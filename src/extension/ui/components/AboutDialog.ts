import Gio from 'gi://Gio';
import St from 'gi://St';
import { ModalDialog } from 'resource:///org/gnome/shell/ui/modalDialog.js';
import { MessageDialogContent } from 'resource:///org/gnome/shell/ui/dialog.js';

const REPO_URL = 'https://github.com/tito10047/menubar-for-symfony';

export interface AboutDetails {
    extensionVersion: string;
    /** Version reported by the helper daemon, or an empty string when unknown. */
    symfonyVersion: string;
}

export function openAboutDialog(details: AboutDetails): void {
    const dialog = new ModalDialog({ destroyOnClose: true });

    const symfonyLine = details.symfonyVersion === ''
        ? ''
        : `\nSymfony CLI: ${details.symfonyVersion}`;

    const content = new MessageDialogContent({
        title: 'Menu Bar for Symfony',
        description:
            'Manage your Symfony local servers from the GNOME top bar.\n\n' +
            `Author: Jozef Môstka\nVersion: ${details.extensionVersion}${symfonyLine}`,
    });

    const repoLabel = new St.Label({
        text: REPO_URL,
        style_class: 'about-repo-link',
        reactive: true,
        track_hover: true,
    });
    repoLabel.clutter_text.ellipsize = 0;
    content.add_child(repoLabel);

    dialog.contentLayout.add_child(content);

    dialog.setButtons([
        {
            label: 'Open on GitHub',
            action: () => {
                Gio.AppInfo.launch_default_for_uri(REPO_URL, null);
                dialog.close();
            },
        },
        {
            label: 'Close',
            default: true,
            action: () => dialog.close(),
        },
    ]);

    dialog.open();
}
