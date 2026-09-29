import {
    ActionsFileSource,
    CustomActionsRepository,
} from '../../../../src/daemon/services/CustomActionsRepository';
import { LoggerInterface } from '../../../../src/shared/interfaces/LoggerInterface';

describe('CustomActionsRepository', () => {
    const PATH = '/home/user/.config/symfony-menubar/actions.json';

    let logger: jest.Mocked<LoggerInterface>;

    beforeEach(() => {
        logger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        };
    });

    function repositoryFor(contents: string | null | (() => never)): CustomActionsRepository {
        const source: ActionsFileSource = {
            path: PATH,
            read: typeof contents === 'function' ? contents : () => contents,
        };
        return new CustomActionsRepository(source, logger);
    }

    /** Every message logged at the given level, joined for substring assertions. */
    function logged(level: keyof LoggerInterface): string {
        return logger[level].mock.calls.map(call => String(call[0])).join('\n');
    }

    it('reads valid actions and derives an id from the name', () => {
        const actions = repositoryFor(JSON.stringify([
            { name: 'Deploy', command: 'npm run deploy', icon: 'mail-send-symbolic', inline: true },
            { name: 'Editor', command: 'code {path}', path: '~/work' },
        ])).list();

        expect(actions).toEqual([
            {
                id: 'Deploy',
                name: 'Deploy',
                command: 'npm run deploy',
                path: undefined,
                icon: 'mail-send-symbolic',
                inline: true,
            },
            {
                id: 'Editor',
                name: 'Editor',
                command: 'code {path}',
                path: '~/work',
                icon: undefined,
                inline: undefined,
            },
        ]);
    });

    it('returns nothing when the file does not exist, and says so', () => {
        expect(repositoryFor(null).list()).toEqual([]);
        expect(logged('debug')).toContain(PATH);
        expect(logger.error).not.toHaveBeenCalled();
    });

    it('reports an unreadable file instead of hiding it', () => {
        const actions = repositoryFor(() => {
            throw new Error('permission denied');
        }).list();

        expect(actions).toEqual([]);
        expect(logged('error')).toContain('permission denied');
    });

    it('reports invalid JSON', () => {
        expect(repositoryFor('[{ oops').list()).toEqual([]);
        expect(logged('error')).toContain('is not valid JSON');
    });

    it('reports a file that is not an array', () => {
        expect(repositoryFor('{"name": "Deploy"}').list()).toEqual([]);
        expect(logged('error')).toContain('must contain a JSON array');
    });

    it.each([
        ['a missing name', { command: 'true' }, "'name' is required"],
        ['a missing command', { name: 'Deploy' }, "'command' is required"],
        ['an empty name', { name: '  ', command: 'true' }, "'name' must not be empty"],
        ['a non-string command', { name: 'Deploy', command: 42 }, "'command' is required"],
        ['a non-string icon', { name: 'Deploy', command: 'true', icon: 7 }, "'icon' must be a string"],
        ['a non-boolean inline', { name: 'Deploy', command: 'true', inline: 'yes' }, "'inline' must be a boolean"],
        ['a bare string entry', 'Deploy', 'expected a JSON object'],
        ['a nested array', [], 'expected a JSON object'],
        ['a null entry', null, 'expected a JSON object'],
    ])('skips an action with %s and logs why', (_label, entry, expectedReason) => {
        const actions = repositoryFor(JSON.stringify([entry])).list();

        expect(actions).toEqual([]);
        expect(logged('warn')).toContain(expectedReason);
        expect(logged('warn')).toContain('#0');
    });

    it('keeps the first of two actions sharing a name and logs the collision', () => {
        const actions = repositoryFor(JSON.stringify([
            { name: 'Deploy', command: 'first' },
            { name: 'Deploy', command: 'second' },
        ])).list();

        expect(actions).toHaveLength(1);
        expect(actions[0].command).toBe('first');
        expect(logged('warn')).toContain("duplicate name 'Deploy'");
    });

    it('keeps the valid actions of a partly broken file', () => {
        const actions = repositoryFor(JSON.stringify([
            { name: 'Broken' },
            { name: 'Deploy', command: 'npm run deploy' },
        ])).list();

        expect(actions.map(action => action.name)).toEqual(['Deploy']);
    });

    it('re-reads the file on every call, so an edit takes effect immediately', () => {
        let contents = JSON.stringify([{ name: 'First', command: 'true' }]);
        const repository = new CustomActionsRepository(
            { path: PATH, read: () => contents },
            logger,
        );

        expect(repository.list().map(action => action.name)).toEqual(['First']);

        contents = JSON.stringify([{ name: 'Second', command: 'true' }]);

        expect(repository.list().map(action => action.name)).toEqual(['Second']);
    });
});
