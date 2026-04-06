import { PhpVersionFileService, GLibFileLike } from '../../../../src/core/services/PhpVersionFileService';

function makeGLibMock(overrides: Partial<GLibFileLike> = {}): jest.Mocked<GLibFileLike> {
    return {
        file_get_contents: jest.fn().mockReturnValue([false, null]),
        file_set_contents: jest.fn().mockReturnValue(true),
        get_home_dir: jest.fn().mockReturnValue('/home/user'),
        ...overrides,
    } as jest.Mocked<GLibFileLike>;
}

describe('PhpVersionFileService', () => {
    const directory = '/home/user/project';
    const phpVersionFile = `${directory}/.php-version`;

    describe('read()', () => {
        it('returns version string when .php-version file exists', () => {
            const contents = new TextEncoder().encode('8.3\n');
            const glib = makeGLibMock({
                file_get_contents: jest.fn().mockReturnValue([true, contents]),
            });
            const service = new PhpVersionFileService(glib);

            expect(service.read(directory)).toBe('8.3');
        });

        it('returns version string trimmed of whitespace and newlines', () => {
            const contents = new TextEncoder().encode('  8.4  \n');
            const glib = makeGLibMock({
                file_get_contents: jest.fn().mockReturnValue([true, contents]),
            });
            const service = new PhpVersionFileService(glib);

            expect(service.read(directory)).toBe('8.4');
        });

        it('returns null when file does not exist (ok=false)', () => {
            const glib = makeGLibMock({
                file_get_contents: jest.fn().mockReturnValue([false, null]),
            });
            const service = new PhpVersionFileService(glib);

            expect(service.read(directory)).toBeNull();
        });

        it('returns null when file_get_contents throws', () => {
            const glib = makeGLibMock({
                file_get_contents: jest.fn().mockImplementation(() => {
                    throw new Error('No such file or directory');
                }),
            });
            const service = new PhpVersionFileService(glib);

            expect(service.read(directory)).toBeNull();
        });

        it('reads from correct path (directory + /.php-version)', () => {
            const glib = makeGLibMock();
            const service = new PhpVersionFileService(glib);

            service.read(directory);

            expect(glib.file_get_contents).toHaveBeenCalledWith(phpVersionFile);
        });

        it('expands leading tilde to home directory', () => {
            const contents = new TextEncoder().encode('8.3\n');
            const glib = makeGLibMock({
                file_get_contents: jest.fn().mockReturnValue([true, contents]),
            });
            const service = new PhpVersionFileService(glib);

            expect(service.read('~/project')).toBe('8.3');
            expect(glib.file_get_contents).toHaveBeenCalledWith('/home/user/project/.php-version');
        });
    });

    describe('write()', () => {
        it('writes version with trailing newline to .php-version', () => {
            const glib = makeGLibMock();
            const service = new PhpVersionFileService(glib);

            service.write(directory, '8.3');

            expect(glib.file_set_contents).toHaveBeenCalledWith(phpVersionFile, '8.3\n');
        });

        it('writes to correct path (directory + /.php-version)', () => {
            const glib = makeGLibMock();
            const service = new PhpVersionFileService(glib);

            service.write(directory, '8.1');

            expect(glib.file_set_contents).toHaveBeenCalledWith(
                '/home/user/project/.php-version',
                '8.1\n'
            );
        });

        it('overwrites existing .php-version with new version', () => {
            const glib = makeGLibMock();
            const service = new PhpVersionFileService(glib);

            service.write(directory, '8.4');

            expect(glib.file_set_contents).toHaveBeenCalledWith(phpVersionFile, '8.4\n');
        });

        it('expands leading tilde to home directory', () => {
            const glib = makeGLibMock();
            const service = new PhpVersionFileService(glib);

            service.write('~/project', '8.3');

            expect(glib.file_set_contents).toHaveBeenCalledWith('/home/user/project/.php-version', '8.3\n');
        });
    });
});
