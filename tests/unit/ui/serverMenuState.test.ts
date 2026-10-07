import {
    sortServersByDirectory,
    sameMenuRelevantState,
    menuStructureKey,
    sameCustomActions,
    phpSectionKey,
} from '../../../src/extension/ui/serverMenuState';
import { SymfonyServer } from '../../../src/shared/dto/SymfonyServer';
import { PhpExtensionStatus, PhpInfo } from '../../../src/shared/dto/PhpInfo';

function server(overrides: Partial<SymfonyServer> = {}): SymfonyServer {
    return {
        directory: '/home/user/app',
        port: 8000,
        url: 'https://app.wip',
        domain: 'app.wip',
        isRunning: true,
        ...overrides,
    };
}

describe('sortServersByDirectory', () => {
    it('orders by directory without touching the input', () => {
        const input = [server({ directory: '/b' }), server({ directory: '/a' })];

        const sorted = sortServersByDirectory(input);

        expect(sorted.map(s => s.directory)).toEqual(['/a', '/b']);
        expect(input.map(s => s.directory)).toEqual(['/b', '/a']);
    });
});

describe('sameMenuRelevantState', () => {
    it('ignores a domain that the CLI reported differently', () => {
        const before = [server({ domain: 'ts.app.wip' })];
        const after = [server({ domain: 'no.app.wip' })];

        expect(sameMenuRelevantState(before, after)).toBe(true);
    });

    it('reports a changed running state', () => {
        expect(sameMenuRelevantState(
            [server({ isRunning: true })],
            [server({ isRunning: false })],
        )).toBe(false);
    });

    it('reports a changed port, URL or PHP version', () => {
        expect(sameMenuRelevantState([server()], [server({ port: 8001 })])).toBe(false);
        expect(sameMenuRelevantState([server()], [server({ url: 'https://other.wip' })])).toBe(false);
        expect(sameMenuRelevantState([server()], [server({ phpVersion: '8.3' })])).toBe(false);
    });

    it('treats a missing and an undefined PHP version as equal', () => {
        expect(sameMenuRelevantState([server()], [server({ phpVersion: undefined })])).toBe(true);
    });

    it('reports an added or removed server', () => {
        expect(sameMenuRelevantState([server()], [])).toBe(false);
        expect(sameMenuRelevantState(
            [server({ directory: '/a' })],
            [server({ directory: '/b' })],
        )).toBe(false);
    });
});

describe('menuStructureKey', () => {
    const favorites = (directory: string) => directory === '/a';

    it('changes when a server moves between the favorite and other section', () => {
        const servers = [server({ directory: '/a' }), server({ directory: '/b' })];

        const before = menuStructureKey(servers, favorites);
        const after = menuStructureKey(servers, directory => directory === '/b');

        expect(before).not.toBe(after);
    });

    it('does not change when only the running state differs', () => {
        const before = menuStructureKey([server({ directory: '/a', isRunning: true })], favorites);
        const after = menuStructureKey([server({ directory: '/a', isRunning: false })], favorites);

        expect(before).toBe(after);
    });

    it('changes when a server is added', () => {
        const before = menuStructureKey([server({ directory: '/a' })], favorites);
        const after = menuStructureKey(
            [server({ directory: '/a' }), server({ directory: '/b' })],
            favorites,
        );

        expect(before).not.toBe(after);
    });
});

describe('sameCustomActions', () => {
    it('accepts two empty lists', () => {
        expect(sameCustomActions([], [])).toBe(true);
    });

    it('accepts the same list reported again', () => {
        const actions = [{ id: 'a', name: 'Composer install', icon: 'system-run-symbolic' }];

        expect(sameCustomActions(actions, [{ ...actions[0] }])).toBe(true);
    });

    it('reports a renamed, re-iconed or newly inlined action', () => {
        const actions = [{ id: 'a', name: 'Composer install' }];

        expect(sameCustomActions(actions, [{ id: 'a', name: 'Composer update' }])).toBe(false);
        expect(sameCustomActions(actions, [{ id: 'a', name: 'Composer install', icon: 'x' }])).toBe(false);
        expect(sameCustomActions(actions, [{ id: 'a', name: 'Composer install', inline: true }])).toBe(false);
        expect(sameCustomActions(actions, [])).toBe(false);
    });
});

describe('phpSectionKey', () => {
    const info: PhpInfo = {
        phpIniPath: '/etc/php.ini',
        xdebug: PhpExtensionStatus.ENABLED,
        apcu: PhpExtensionStatus.INSTALLED,
        opcache: PhpExtensionStatus.NOT_INSTALLED,
    };

    it('is stable for the same versions and badges', () => {
        const versions = [{ version: '8.3.1', path: '/usr/bin/php83', isDefault: true }];
        const map = new Map([['8.3.1', info]]);

        expect(phpSectionKey(versions, map)).toBe(phpSectionKey(versions, new Map([['8.3.1', { ...info }]])));
    });

    it('changes when a badge or the default version changes', () => {
        const versions = [{ version: '8.3.1', path: '/usr/bin/php83', isDefault: true }];
        const map = new Map([['8.3.1', info]]);

        expect(phpSectionKey(versions, map)).not.toBe(
            phpSectionKey(versions, new Map([['8.3.1', { ...info, apcu: PhpExtensionStatus.ENABLED }]])),
        );
        expect(phpSectionKey(versions, map)).not.toBe(
            phpSectionKey([{ ...versions[0], isDefault: false }], map),
        );
    });
});
