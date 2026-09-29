import { LoggerInterface } from '../../../shared/interfaces/LoggerInterface.js';
import { formatError } from '../../../shared/errors.js';

/**
 * Minimal subset of GLib file operations used by PhpVersionFileService.
 * Duck-typed so the class remains testable in Jest (Node.js) without GJS.
 */
export interface GLibFileLike {
    file_get_contents(path: string): [boolean, Uint8Array | null];
    file_set_contents(path: string, contents: string): boolean;
    get_home_dir(): string;
}

export interface PhpVersionFileServiceInterface {
    read(directory: string): string | null;
    write(directory: string, version: string): boolean;
}

/**
 * Reads and writes `.php-version` files in project directories.
 * The file contains a single PHP version string (e.g. "8.3"), read by the
 * Symfony CLI when it starts a server.
 *
 * This is the only file access left in the extension; it needs no subprocess, so
 * moving it to the helper daemon would only add a round trip.
 */
export class PhpVersionFileService implements PhpVersionFileServiceInterface {
    constructor(
        private readonly glib: GLibFileLike,
        private readonly logger: LoggerInterface,
    ) {}

    private _filePath(directory: string): string {
        const expanded = directory.startsWith('~/')
            ? `${this.glib.get_home_dir()}${directory.slice(1)}`
            : directory;
        return `${expanded}/.php-version`;
    }

    /**
     * Reads the PHP version from `directory/.php-version`, or returns null when
     * there is none.
     *
     * A project without the file is the normal case and runs for every server on
     * every refresh, so the reason is logged at debug level rather than as a
     * warning — but it is logged, so an unreadable file is never invisible.
     */
    read(directory: string): string | null {
        const path = this._filePath(directory);

        try {
            const [ok, contents] = this.glib.file_get_contents(path);
            if (!ok || contents === null) {
                this.logger.debug(`No .php-version at ${path}`);
                return null;
            }
            return new TextDecoder().decode(contents).trim() || null;
        } catch (cause) {
            this.logger.debug(`Could not read ${path}: ${formatError(cause)}`);
            return null;
        }
    }

    /**
     * Writes the PHP version to `directory/.php-version`.
     *
     * @returns Whether the file was written. Callers must not report success to
     *          the user on a false return; the reason is already logged here.
     */
    write(directory: string, version: string): boolean {
        const path = this._filePath(directory);

        try {
            if (!this.glib.file_set_contents(path, `${version}\n`)) {
                this.logger.error(`GLib reported a failure while writing ${path}`);
                return false;
            }
            this.logger.info(`Wrote PHP version ${version} to ${path}`);
            return true;
        } catch (cause) {
            this.logger.error(`Could not write ${path}: ${formatError(cause)}`);
            return false;
        }
    }
}
