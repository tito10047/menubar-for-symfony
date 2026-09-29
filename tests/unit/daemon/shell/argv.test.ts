import {
    ShellArgvParser,
    buildActionArgv,
    buildTerminalArgv,
    resolveWorkingDirectory,
} from '../../../../src/daemon/shell/argv';
import { DaemonFailure } from '../../../../src/daemon/DaemonFailure';
import { DaemonError } from '../../../../src/shared/dbus/protocol';

/**
 * Stand-in for `GLib.shell_parse_argv`. Splitting on whitespace is enough here:
 * these tests are about what happens to `{path}` *after* the split, which is the
 * property that keeps a directory name from turning into extra arguments.
 */
const splitOnWhitespace: ShellArgvParser = command => command.split(/\s+/).filter(part => part !== '');

describe('buildActionArgv', () => {
    it('substitutes the directory into a single argument', () => {
        expect(buildActionArgv(splitOnWhitespace, 'code {path}', '/home/user/project'))
            .toEqual(['code', '/home/user/project']);
    });

    it.each([
        ['a space', '/home/user/my project'],
        ['a semicolon', '/tmp/x; rm -rf ~'],
        ['a command substitution', '/tmp/$(id)'],
        ['a backtick', '/tmp/`id`'],
        ['a single quote', "/home/user/it's mine"],
        ['a double quote and ampersand', '/tmp/a" && curl evil.example'],
        ['a pipe', '/tmp/a | tee /tmp/b'],
        ['a newline', '/tmp/a\nrm -rf ~'],
    ])('keeps a directory containing %s inside one argument', (_label, directory) => {
        const argv = buildActionArgv(splitOnWhitespace, 'code {path}', directory);

        expect(argv).toHaveLength(2);
        expect(argv[0]).toBe('code');
        expect(argv[1]).toBe(directory);
    });

    it('substitutes every occurrence, including inside a longer argument', () => {
        expect(buildActionArgv(splitOnWhitespace, 'tar -C {path} -cf {path}.tar --dir={path}', '/srv/app'))
            .toEqual(['tar', '-C', '/srv/app', '-cf', '/srv/app.tar', '--dir=/srv/app']);
    });

    it('leaves a command without the placeholder untouched', () => {
        expect(buildActionArgv(splitOnWhitespace, 'npm run deploy', '/srv/app'))
            .toEqual(['npm', 'run', 'deploy']);
    });

    it('rejects a command that yields no arguments', () => {
        expect(() => buildActionArgv(splitOnWhitespace, '   ', '/srv/app'))
            .toThrow(DaemonFailure);
        expect(() => buildActionArgv(splitOnWhitespace, '   ', '/srv/app'))
            .toThrow('does not contain any arguments');
    });

    it('reports a command the parser cannot split as an invalid argument', () => {
        const failing: ShellArgvParser = () => {
            throw new Error('unbalanced quotes');
        };

        try {
            buildActionArgv(failing, "code '", '/srv/app');
            fail('expected buildActionArgv to throw');
        } catch (cause) {
            expect(cause).toBeInstanceOf(DaemonFailure);
            expect((cause as DaemonFailure).dbusErrorName).toBe(DaemonError.INVALID_ARGUMENT);
            expect((cause as DaemonFailure).message).toContain('unbalanced quotes');
        }
    });
});

describe('buildTerminalArgv', () => {
    const LOG_COMMAND = ['/usr/bin/symfony', 'server:log', '--dir=/srv/my app'];

    it('replaces the placeholder with the command arguments', () => {
        expect(buildTerminalArgv(splitOnWhitespace, 'ptyxis -- %s', LOG_COMMAND))
            .toEqual(['ptyxis', '--', '/usr/bin/symfony', 'server:log', '--dir=/srv/my app']);
    });

    it('keeps arguments that follow the placeholder', () => {
        expect(buildTerminalArgv(splitOnWhitespace, 'konsole -e %s --hold', LOG_COMMAND))
            .toEqual(['konsole', '-e', ...LOG_COMMAND, '--hold']);
    });

    it('appends the command when the placeholder is absent', () => {
        expect(buildTerminalArgv(splitOnWhitespace, 'gnome-terminal --', LOG_COMMAND))
            .toEqual(['gnome-terminal', '--', ...LOG_COMMAND]);
    });

    it('rejects an empty terminal command', () => {
        expect(() => buildTerminalArgv(splitOnWhitespace, '  ', LOG_COMMAND))
            .toThrow('does not contain any arguments');
    });
});

describe('resolveWorkingDirectory', () => {
    const HOME = '/home/user';

    it('defaults to the server directory', () => {
        expect(resolveWorkingDirectory(undefined, '/srv/app', HOME)).toBe('/srv/app');
    });

    it('expands a leading tilde', () => {
        expect(resolveWorkingDirectory('~/work/project', '/srv/app', HOME)).toBe('/home/user/work/project');
    });

    it('substitutes the placeholder', () => {
        expect(resolveWorkingDirectory('{path}/var/log', '/srv/app', HOME)).toBe('/srv/app/var/log');
    });

    it('leaves an absolute path alone', () => {
        expect(resolveWorkingDirectory('/opt/tools', '/srv/app', HOME)).toBe('/opt/tools');
    });

    it('does not expand a tilde that is not at the start', () => {
        expect(resolveWorkingDirectory('/srv/~/app', '/srv/app', HOME)).toBe('/srv/~/app');
    });
});
