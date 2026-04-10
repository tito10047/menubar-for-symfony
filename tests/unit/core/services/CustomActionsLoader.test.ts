import { CustomActionsLoader, GLibReadLike } from '../../../../src/core/services/CustomActionsLoader';

function makeGLibMock(overrides: Partial<GLibReadLike> = {}): jest.Mocked<GLibReadLike> {
    return {
        file_get_contents: jest.fn().mockReturnValue([false, null]),
        ...overrides,
    } as jest.Mocked<GLibReadLike>;
}

describe('CustomActionsLoader', () => {
    const extensionPath = '/home/user/.local/share/gnome-shell/extensions/symfony-menubar';
    const actionsFilePath = `${extensionPath}/actions.json`;

    describe('load()', () => {
        it('reads from <extensionPath>/actions.json', () => {
            const glib = makeGLibMock();
            const loader = new CustomActionsLoader(glib);

            loader.load(extensionPath);

            expect(glib.file_get_contents).toHaveBeenCalledWith(actionsFilePath);
        });

        it('returns [] when file does not exist (ok=false)', () => {
            const glib = makeGLibMock({
                file_get_contents: jest.fn().mockReturnValue([false, null]),
            });
            const loader = new CustomActionsLoader(glib);

            expect(loader.load(extensionPath)).toEqual([]);
        });

        it('returns [] when file_get_contents throws', () => {
            const glib = makeGLibMock({
                file_get_contents: jest.fn().mockImplementation(() => {
                    throw new Error('Permission denied');
                }),
            });
            const loader = new CustomActionsLoader(glib);

            expect(loader.load(extensionPath)).toEqual([]);
        });

        it('returns [] when file contents are invalid JSON', () => {
            const contents = new TextEncoder().encode('not valid json {{{');
            const glib = makeGLibMock({
                file_get_contents: jest.fn().mockReturnValue([true, contents]),
            });
            const loader = new CustomActionsLoader(glib);

            expect(loader.load(extensionPath)).toEqual([]);
        });

        it('returns [] when JSON is not an array', () => {
            const contents = new TextEncoder().encode('{"name":"Deploy","command":"npm run deploy"}');
            const glib = makeGLibMock({
                file_get_contents: jest.fn().mockReturnValue([true, contents]),
            });
            const loader = new CustomActionsLoader(glib);

            expect(loader.load(extensionPath)).toEqual([]);
        });

        it('returns [] when JSON is null', () => {
            const contents = new TextEncoder().encode('null');
            const glib = makeGLibMock({
                file_get_contents: jest.fn().mockReturnValue([true, contents]),
            });
            const loader = new CustomActionsLoader(glib);

            expect(loader.load(extensionPath)).toEqual([]);
        });

        it('parses valid actions array', () => {
            const actions = [
                { name: 'Deploy', command: 'npm run deploy', icon: 'mail-send-symbolic', inline: true },
                { name: 'Open VS Code', command: 'code .', path: '~/work/project' },
            ];
            const contents = new TextEncoder().encode(JSON.stringify(actions));
            const glib = makeGLibMock({
                file_get_contents: jest.fn().mockReturnValue([true, contents]),
            });
            const loader = new CustomActionsLoader(glib);

            const result = loader.load(extensionPath);

            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({ name: 'Deploy', command: 'npm run deploy', icon: 'mail-send-symbolic', inline: true });
            expect(result[1]).toEqual({ name: 'Open VS Code', command: 'code .', path: '~/work/project' });
        });

        it('filters out entries missing required "name" field', () => {
            const actions = [
                { command: 'npm run deploy' },
                { name: 'Valid', command: 'echo ok' },
            ];
            const contents = new TextEncoder().encode(JSON.stringify(actions));
            const glib = makeGLibMock({
                file_get_contents: jest.fn().mockReturnValue([true, contents]),
            });
            const loader = new CustomActionsLoader(glib);

            const result = loader.load(extensionPath);

            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Valid');
        });

        it('filters out entries missing required "command" field', () => {
            const actions = [
                { name: 'No command' },
                { name: 'Valid', command: 'echo ok' },
            ];
            const contents = new TextEncoder().encode(JSON.stringify(actions));
            const glib = makeGLibMock({
                file_get_contents: jest.fn().mockReturnValue([true, contents]),
            });
            const loader = new CustomActionsLoader(glib);

            const result = loader.load(extensionPath);

            expect(result).toHaveLength(1);
            expect(result[0].command).toBe('echo ok');
        });

        it('filters out non-object entries', () => {
            const actions = ['string', 42, null, { name: 'Valid', command: 'echo ok' }];
            const contents = new TextEncoder().encode(JSON.stringify(actions));
            const glib = makeGLibMock({
                file_get_contents: jest.fn().mockReturnValue([true, contents]),
            });
            const loader = new CustomActionsLoader(glib);

            const result = loader.load(extensionPath);

            expect(result).toHaveLength(1);
        });

        it('preserves optional fields (path, icon, inline) when present', () => {
            const actions = [{ name: 'Test', command: 'echo test', path: '/tmp', icon: 'test-icon', inline: true }];
            const contents = new TextEncoder().encode(JSON.stringify(actions));
            const glib = makeGLibMock({
                file_get_contents: jest.fn().mockReturnValue([true, contents]),
            });
            const loader = new CustomActionsLoader(glib);

            const result = loader.load(extensionPath);

            expect(result[0].path).toBe('/tmp');
            expect(result[0].icon).toBe('test-icon');
            expect(result[0].inline).toBe(true);
        });

        it('returns actions without optional fields when absent', () => {
            const actions = [{ name: 'Minimal', command: 'ls' }];
            const contents = new TextEncoder().encode(JSON.stringify(actions));
            const glib = makeGLibMock({
                file_get_contents: jest.fn().mockReturnValue([true, contents]),
            });
            const loader = new CustomActionsLoader(glib);

            const result = loader.load(extensionPath);

            expect(result[0].path).toBeUndefined();
            expect(result[0].icon).toBeUndefined();
            expect(result[0].inline).toBeUndefined();
        });
    });
});
