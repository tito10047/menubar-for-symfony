import St from 'gi://St';
import Clutter from 'gi://Clutter';
import { ModalDialog } from 'resource:///org/gnome/shell/ui/modalDialog.js';
import { MessageDialogContent } from 'resource:///org/gnome/shell/ui/dialog.js';
import { PhpVersion } from '../../core/dto/PhpVersion.js';

export interface PhpVersionDialogParams {
    serverName: string;
    currentVersion: string | null;
    availableVersions: PhpVersion[];
    onSelect: (version: string) => void;
}

/**
 * Opens a modal dialog allowing the user to select a PHP version for a server project.
 * The selected version is written to `.php-version` in the server's directory via onSelect callback.
 */
export function openPhpVersionDialog(params: PhpVersionDialogParams): void {
    const { serverName, currentVersion, availableVersions, onSelect } = params;

    const dialog = new ModalDialog({ destroyOnClose: true });

    const content = new MessageDialogContent({
        title: `Set PHP version — ${serverName}`,
        description: currentVersion
            ? `Current version: ${currentVersion}`
            : 'No PHP version configured',
    });

    dialog.contentLayout.add_child(content);

    const versionBox = new St.BoxLayout({
        vertical: true,
        style_class: 'php-version-dialog-list',
    });

    for (const phpVersion of availableVersions) {
        const isCurrent = phpVersion.version === currentVersion;
        const label = isCurrent ? `✓ ${phpVersion.version}` : phpVersion.version;

        const btn = new St.Button({
            label,
            style_class: isCurrent
                ? 'php-version-dialog-item php-version-dialog-item-current'
                : 'php-version-dialog-item',
            can_focus: true,
            x_align: Clutter.ActorAlign.FILL,
            x_expand: true,
        });

        btn.connect('clicked', () => {
            onSelect(phpVersion.version);
            dialog.close();
        });

        versionBox.add_child(btn);
    }

    dialog.contentLayout.add_child(versionBox);

    dialog.setButtons([
        {
            label: 'Cancel',
            default: true,
            action: () => dialog.close(),
        },
    ]);

    dialog.open();
}
