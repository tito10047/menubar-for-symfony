import {
    HELPER_RELEASES_URL,
    HELPER_REPO_URL,
    SYMFONY_DOWNLOAD_URL,
    statusDialogContent,
    statusMessage,
} from '../../../src/extension/ui/statusPresentation';
import { API_VERSION } from '../../../src/shared/dbus/protocol';
import type { DaemonAvailability } from '../../../src/extension/core/dbus/DaemonConnection';

const available = { kind: 'available' } as unknown as DaemonAvailability;

describe('statusMessage', () => {
    it('says nothing while the helper and the CLI are both there', () => {
        expect(statusMessage(available, true)).toBeNull();
    });

    it('asks for the helper when it is missing', () => {
        expect(statusMessage({ kind: 'unavailable' }, true))
            .toBe('Helper app not found — click here to learn how to install it.');
    });

    it('names both protocol versions when they disagree', () => {
        const message = statusMessage({ kind: 'incompatible', daemonApiVersion: 7 }, true);

        expect(message).toContain('7');
        expect(message).toContain(String(API_VERSION));
    });

    it('passes a failure through', () => {
        expect(statusMessage({ kind: 'failed', message: 'boom' }, true)).toContain('boom');
    });

    it('asks for the Symfony CLI when the helper cannot find it', () => {
        expect(statusMessage(available, false)).toContain('Symfony CLI');
    });
});

describe('statusDialogContent', () => {
    it('has nothing to explain while everything works', () => {
        expect(statusDialogContent(available, true)).toBeNull();
    });

    it('explains the helper and links to its repository when it is missing', () => {
        const content = statusDialogContent({ kind: 'unavailable' }, true);

        expect(content).not.toBeNull();
        expect(content!.title).toBe('Helper app not installed');
        expect(content!.description).toContain('menubar-for-symfony-daemon');
        expect(content!.steps).toContain('./install.sh');
        expect(content!.links.map(link => link.url)).toEqual([
            HELPER_RELEASES_URL,
            `${HELPER_REPO_URL}#installation`,
        ]);
    });

    it('tells the user to refresh once the helper is installed', () => {
        const content = statusDialogContent({ kind: 'unavailable' }, true);

        expect(content!.footer?.toLowerCase()).toContain('refresh');
    });

    it('asks for an update when the protocol versions disagree', () => {
        const content = statusDialogContent({ kind: 'incompatible', daemonApiVersion: 7 }, true);

        expect(content!.title).toBe('Helper app is out of date');
        expect(content!.description).toContain('7');
        expect(content!.description).toContain(String(API_VERSION));
        expect(content!.links.map(link => link.url)).toContain(HELPER_RELEASES_URL);
    });

    it('shows the failure and where the helper logs', () => {
        const content = statusDialogContent({ kind: 'failed', message: 'Subscribe timed out' }, true);

        expect(content!.title).toBe('Helper app error');
        expect(content!.description).toContain('Subscribe timed out');
        expect(content!.steps?.join('\n')).toContain('journalctl');
    });

    it('points at the Symfony CLI download and the symfony-path setting', () => {
        const content = statusDialogContent(available, false);

        expect(content!.title).toBe('Symfony CLI not found');
        expect(content!.links.map(link => link.url)).toContain(SYMFONY_DOWNLOAD_URL);
        expect(content!.steps?.join('\n')).toContain('symfony-path');
    });
});
