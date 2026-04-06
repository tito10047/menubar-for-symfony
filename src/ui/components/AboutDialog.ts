import Gio from 'gi://Gio';
import St from 'gi://St';
import { ModalDialog } from 'resource:///org/gnome/shell/ui/modalDialog.js';
import { MessageDialogContent } from 'resource:///org/gnome/shell/ui/dialog.js';

const REPO_URL = 'https://github.com/tito10047/symfony-cli-menubar';

export function openAboutDialog(version?: string): void {
    const dialog = new ModalDialog({ destroyOnClose: true });

    const versionStr = version ?? '1';
    const content = new MessageDialogContent({
        title: 'Symfony CLI Menubar',
        description: `Manage your Symfony local servers from the GNOME top bar.\n\nAuthor: Jozef Môstka\nVersion: ${versionStr}`,
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
