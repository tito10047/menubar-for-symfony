import {
    PhpVersionFileService,
    GLibFileLike,
} from '../../../../src/extension/core/services/PhpVersionFileService';
import { LoggerInterface } from '../../../../src/shared/interfaces/LoggerInterface';

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

    let logger: jest.Mocked<LoggerInterface>;

    beforeEach(() => {
        logger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        };
    });

    function serviceWith(glib: jest.Mocked<GLibFileLike>): PhpVersionFileService {
        return new PhpVersionFileService(glib, logger);
    }

    describe('read()', () => {
        it('returns the version when .php-version exists', () => {
            const glib = makeGLibMock({
                file_get_contents: jest.fn().mockReturnValue([true, new TextEncoder().encode('8.3\n')]),
            });

            expect(serviceWith(glib).read(directory)).toBe('8.3');
        });

        it('trims surrounding whitespace and newlines', () => {
            const glib = makeGLibMock({
                file_get_contents: jest.fn().mockReturnValue([true, new TextEncoder().encode('  8.4  \n')]),
            });

            expect(serviceWith(glib).read(directory)).toBe('8.4');
        });

        it('returns null and says so when the file is absent', () => {
            const glib = makeGLibMock({
                file_get_contents: jest.fn().mockReturnValue([false, null]),
            });

            expect(serviceWith(glib).read(directory)).toBeNull();
            expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining(phpVersionFile));
        });

        it('logs the reason when the file cannot be read instead of hiding it', () => {
            const glib = makeGLibMock({
                file_get_contents: jest.fn().mockImplementation(() => {
                    throw new Error('permission denied');
                }),
            });

            expect(serviceWith(glib).read(directory)).toBeNull();
            expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('permission denied'));
        });

        it('reads from directory + /.php-version', () => {
            const glib = makeGLibMock();

            serviceWith(glib).read(directory);

            expect(glib.file_get_contents).toHaveBeenCalledWith(phpVersionFile);
        });

        it('expands a leading tilde to the home directory', () => {
            const glib = makeGLibMock({
                file_get_contents: jest.fn().mockReturnValue([true, new TextEncoder().encode('8.3\n')]),
            });

            expect(serviceWith(glib).read('~/project')).toBe('8.3');
            expect(glib.file_get_contents).toHaveBeenCalledWith('/home/user/project/.php-version');
        });
    });

    describe('write()', () => {
        it('writes the version with a trailing newline and reports success', () => {
            const glib = makeGLibMock();

            expect(serviceWith(glib).write(directory, '8.3')).toBe(true);
            expect(glib.file_set_contents).toHaveBeenCalledWith(phpVersionFile, '8.3\n');
        });

        it('expands a leading tilde to the home directory', () => {
            const glib = makeGLibMock();

            serviceWith(glib).write('~/project', '8.3');

            expect(glib.file_set_contents).toHaveBeenCalledWith('/home/user/project/.php-version', '8.3\n');
        });

        it('reports failure and logs when GLib refuses the write', () => {
            const glib = makeGLibMock({
                file_set_contents: jest.fn().mockReturnValue(false),
            });

            expect(serviceWith(glib).write(directory, '8.3')).toBe(false);
            expect(logger.error).toHaveBeenCalledWith(expect.stringContaining(phpVersionFile));
        });

        it('reports failure and logs when the write throws', () => {
            const glib = makeGLibMock({
                file_set_contents: jest.fn().mockImplementation(() => {
                    throw new Error('read-only file system');
                }),
            });

            expect(serviceWith(glib).write(directory, '8.3')).toBe(false);
            expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('read-only file system'));
        });
    });
});
