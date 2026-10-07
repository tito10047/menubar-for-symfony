import { API_VERSION } from '../../shared/dbus/protocol.js';
import type { DaemonAvailability } from '../core/dbus/DaemonConnection.js';

/**
 * Turns the connection state into what the user reads: the one-line message in
 * the menu, and the dialog behind it that explains what to install and where to
 * get it. Kept free of GJS so the wording is unit-tested rather than eyeballed.
 */

export const HELPER_NAME = 'menubar-for-symfony-daemon';
export const HELPER_REPO_URL = 'https://github.com/tito10047/menubar-for-symfony-daemon';
export const HELPER_RELEASES_URL = `${HELPER_REPO_URL}/releases/latest`;
export const SYMFONY_DOWNLOAD_URL = 'https://symfony.com/download';

const SCHEMA_DIR = '~/.local/share/gnome-shell/extensions/menubar-for-symfony@tito10047.github.com/schemas';

export interface StatusLink {
    label: string;
    url: string;
}

export interface StatusDialogContent {
    title: string;
    /** Paragraphs, separated by blank lines. */
    description: string;
    /** Shell commands, shown as a block the user can read off. */
    steps?: string[];
    /** Closing line, shown under the commands. */
    footer?: string;
    links: StatusLink[];
}

/** The line shown in place of the server and proxy sections, or null when healthy. */
export function statusMessage(availability: DaemonAvailability, cliAvailable: boolean): string | null {
    switch (availability.kind) {
        case 'unavailable':
            return 'Helper app not found — click here to learn how to install it.';
        case 'incompatible':
            return `Helper app speaks API version ${availability.daemonApiVersion}, ` +
                `this extension needs ${API_VERSION}. Click here.`;
        case 'failed':
            return `Helper app error: ${availability.message}. Click here.`;
        case 'available':
            return cliAvailable
                ? null
                : 'Symfony CLI not detected — click here to learn more.';
    }
}

const INSTALL_STEPS = [
    'tar -xzf menubar-for-symfony-daemon-*.tar.gz',
    'cd menubar-for-symfony-daemon-*',
    './install.sh',
];

const AFTER_INSTALL = 'Then click the refresh icon next to “Servers” in the menu — ' +
    'the extension looks for the helper again, no logout needed.';

/** What the dialog behind the status line says, or null when there is nothing to say. */
export function statusDialogContent(
    availability: DaemonAvailability,
    cliAvailable: boolean,
): StatusDialogContent | null {
    switch (availability.kind) {
        case 'unavailable':
            return {
                title: 'Helper app not installed',
                description: [
                    'This extension never runs the Symfony CLI itself. A small helper app, ' +
                    `${HELPER_NAME}, does that for it over D-Bus — which is what keeps ` +
                    'command execution out of the GNOME Shell process.',

                    'Installing it needs no root privileges and brings no new runtime: it is ' +
                    'plain JavaScript run by /usr/bin/gjs, which ships with GNOME Shell. ' +
                    'Download the latest release, unpack it and run the installer:',
                ].join('\n\n'),
                steps: INSTALL_STEPS,
                footer: AFTER_INSTALL,
                links: [
                    { label: 'Download the latest release', url: HELPER_RELEASES_URL },
                    { label: 'Installation instructions', url: `${HELPER_REPO_URL}#installation` },
                ],
            };

        case 'incompatible':
            return {
                title: 'Helper app is out of date',
                description: [
                    `The installed helper app speaks protocol version ${availability.daemonApiVersion}, ` +
                    `while this extension speaks version ${API_VERSION}. The two halves have to ` +
                    'agree, so whichever of them is older needs updating — usually the helper.',

                    'Install the release that matches this version of the extension:',
                ].join('\n\n'),
                steps: INSTALL_STEPS,
                footer: AFTER_INSTALL,
                links: [
                    { label: 'Download the latest release', url: HELPER_RELEASES_URL },
                    { label: 'Installation instructions', url: `${HELPER_REPO_URL}#installation` },
                ],
            };

        case 'failed':
            return {
                title: 'Helper app error',
                description: [
                    `The helper app is installed, but the extension could not use it:`,
                    availability.message,
                    'That usually means it failed on startup. It logs to the journal, ' +
                    'where the reason should be waiting:',
                ].join('\n\n'),
                steps: ['journalctl -b -o cat --identifier gjs'],
                links: [
                    { label: 'Report an issue', url: `${HELPER_REPO_URL}/issues` },
                    { label: 'Installation instructions', url: `${HELPER_REPO_URL}#installation` },
                ],
            };

        case 'available':
            if (cliAvailable) return null;
            return {
                title: 'Symfony CLI not found',
                description: [
                    'The helper app is running, but it could not find the symfony binary. ' +
                    'Install the Symfony CLI from the link below.',

                    'The helper is started by D-Bus and therefore does not inherit your ' +
                    'shell PATH. It looks in ~/.symfony5/bin, ~/.symfony/bin, ~/.local/bin, ' +
                    '/usr/local/bin and /usr/bin. If yours lives elsewhere, say where:',
                ].join('\n\n'),
                steps: [
                    `gsettings --schemadir ${SCHEMA_DIR} \\`,
                    '  set org.gnome.shell.extensions.menubar-for-symfony \\',
                    '  symfony-path /path/to/symfony',
                ],
                links: [
                    { label: 'Download the Symfony CLI', url: SYMFONY_DOWNLOAD_URL },
                ],
            };
    }
}
