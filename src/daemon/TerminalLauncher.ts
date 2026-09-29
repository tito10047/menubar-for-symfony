import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import { LoggerInterface } from '../shared/interfaces/LoggerInterface.js';
import { formatError } from '../shared/errors.js';
import { DaemonFailure } from './DaemonFailure.js';
import { ShellArgvParser, buildTerminalArgv } from './shell/argv.js';

/**
 * Terminals tried when none is configured, in descending order of likelihood on a
 * GNOME system. Each entry is the argv prefix that makes the terminal treat the
 * rest of the vector as the command to execute.
 */
const FALLBACK_TERMINALS: ReadonlyArray<readonly string[]> = [
    ['ptyxis', '--'],
    ['gnome-terminal', '--'],
    ['kgx', '--'],
    ['konsole', '-e'],
    ['xterm', '-e'],
];

/** Opens a command in a terminal emulator. */
export class TerminalLauncher {
    constructor(
        private readonly logger: LoggerInterface,
        private readonly parseArgv: ShellArgvParser,
    ) {}

    /**
     * @param configuredTerminal Terminal command from the extension's settings,
     *                           or an empty string to auto-detect one.
     */
    launch(command: readonly string[], configuredTerminal: string): void {
        const argv = configuredTerminal.trim() === ''
            ? this._autoDetectArgv(command)
            : buildTerminalArgv(this.parseArgv, configuredTerminal, command);

        this.logger.info(`Opening terminal: ${argv.join(' ')}`);

        let subprocess: Gio.Subprocess;
        try {
            subprocess = Gio.Subprocess.new(argv, Gio.SubprocessFlags.NONE);
        } catch (cause) {
            throw DaemonFailure.terminalNotFound(
                `Could not start terminal '${argv[0]}': ${formatError(cause)}`,
            );
        }

        // The terminal outlives this call; waiting only serves to report one that
        // dies immediately instead of leaving the user guessing.
        subprocess.wait_check_async(null, (_source, result) => {
            try {
                subprocess.wait_check_finish(result);
            } catch (cause) {
                this.logger.warn(`Terminal '${argv[0]}' exited with an error: ${formatError(cause)}`);
            }
        });
    }

    private _autoDetectArgv(command: readonly string[]): string[] {
        for (const prefix of FALLBACK_TERMINALS) {
            const binary = GLib.find_program_in_path(prefix[0]);
            if (binary !== null) {
                this.logger.debug(`Auto-detected terminal ${binary}`);
                return [binary, ...prefix.slice(1), ...command];
            }
        }

        throw DaemonFailure.terminalNotFound(
            'No terminal emulator found. Tried: ' +
            `${FALLBACK_TERMINALS.map(prefix => prefix[0]).join(', ')}. ` +
            'Set the terminal-command setting to the terminal you use.',
        );
    }
}
