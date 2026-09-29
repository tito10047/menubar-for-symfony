import GLib from 'gi://GLib';
import { LoggerInterface } from '../shared/interfaces/LoggerInterface.js';
import { DaemonFailure } from './DaemonFailure.js';

const BINARY_NAME = 'symfony';

/**
 * Knows where the Symfony CLI is and which version it reports.
 *
 * Locating the binary needs more care here than it did inside the extension:
 * gnome-shell inherits the login session's `PATH`, but a D-Bus activated process
 * does not necessarily do so. A Symfony CLI installed by the official installer
 * lives in `~/.symfony5/bin`, which is added to `PATH` by the user's shell
 * profile — something this process never reads. Well-known install locations are
 * therefore probed before reporting the CLI as missing.
 */
export class SymfonyEnvironment {
    private _binaryPath: string | null = null;
    private _version = '';

    constructor(private readonly logger: LoggerInterface) {}

    get available(): boolean {
        return this._binaryPath !== null;
    }

    get version(): string {
        return this._version;
    }

    /**
     * Resolves the binary again, honouring an explicitly configured path.
     *
     * @param configuredPath Absolute path from the extension's settings, or an
     *                       empty string to auto-detect.
     * @returns Whether a usable binary was found.
     */
    locate(configuredPath: string): boolean {
        const resolved = this._resolve(configuredPath.trim());

        if (resolved !== this._binaryPath) {
            this._version = '';
        }
        this._binaryPath = resolved;

        return this.available;
    }

    /** The resolved path, or a `CliNotFound` failure when there is none. */
    requireBinaryPath(): string {
        if (this._binaryPath === null) {
            throw DaemonFailure.cliNotFound(
                'The Symfony CLI was not found. Install it from https://symfony.com/download ' +
                'or set the symfony-path setting to its absolute path.',
            );
        }
        return this._binaryPath;
    }

    rememberVersion(version: string): void {
        this._version = version;
        this.logger.info(`Symfony CLI version: ${version}`);
    }

    private _resolve(configuredPath: string): string | null {
        if (configuredPath !== '') {
            if (isExecutable(configuredPath)) {
                this.logger.info(`Using configured Symfony CLI at ${configuredPath}`);
                return configuredPath;
            }
            this.logger.warn(
                `Configured Symfony CLI path '${configuredPath}' is not an executable file; falling back to auto-detection.`,
            );
        }

        const fromPath = GLib.find_program_in_path(BINARY_NAME);
        if (fromPath !== null) {
            this.logger.info(`Found Symfony CLI on PATH at ${fromPath}`);
            return fromPath;
        }

        for (const candidate of wellKnownPaths()) {
            if (isExecutable(candidate)) {
                this.logger.info(`Found Symfony CLI at well-known location ${candidate}`);
                return candidate;
            }
        }

        this.logger.warn(
            `Symfony CLI not found on PATH (${GLib.getenv('PATH') ?? '<unset>'}) ` +
            `nor at any of: ${wellKnownPaths().join(', ')}`,
        );
        return null;
    }
}

function wellKnownPaths(): string[] {
    const home = GLib.get_home_dir();
    return [
        `${home}/.symfony5/bin/${BINARY_NAME}`,
        `${home}/.symfony/bin/${BINARY_NAME}`,
        `${home}/.local/bin/${BINARY_NAME}`,
        `/usr/local/bin/${BINARY_NAME}`,
        `/usr/bin/${BINARY_NAME}`,
    ];
}

function isExecutable(path: string): boolean {
    return GLib.file_test(path, GLib.FileTest.IS_EXECUTABLE) && !GLib.file_test(path, GLib.FileTest.IS_DIR);
}
