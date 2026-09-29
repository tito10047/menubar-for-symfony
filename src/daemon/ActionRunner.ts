import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import { LoggerInterface } from '../shared/interfaces/LoggerInterface.js';
import { formatError } from '../shared/errors.js';
import { DaemonError } from '../shared/dbus/protocol.js';
import { DaemonFailure } from './DaemonFailure.js';
import { CustomActionDefinition } from './services/CustomActionsRepository.js';
import { ShellArgvParser, buildActionArgv, resolveWorkingDirectory } from './shell/argv.js';

/**
 * Runs user-defined actions.
 *
 * Actions are fire-and-forget from the caller's point of view — the menu closes
 * right away — but the child process is still waited on, so a command that fails
 * or cannot be started shows up in the journal instead of vanishing.
 */
export class ActionRunner {
    constructor(
        private readonly logger: LoggerInterface,
        private readonly parseArgv: ShellArgvParser,
    ) {}

    run(action: CustomActionDefinition, serverDirectory: string): void {
        const workingDirectory = resolveWorkingDirectory(action.path, serverDirectory, GLib.get_home_dir());
        const argv = buildActionArgv(this.parseArgv, action.command, serverDirectory);

        this.logger.info(`Running action '${action.name}' in ${workingDirectory}: ${argv.join(' ')}`);

        const launcher = new Gio.SubprocessLauncher({ flags: Gio.SubprocessFlags.NONE });
        launcher.set_cwd(workingDirectory);

        let subprocess: Gio.Subprocess;
        try {
            subprocess = launcher.spawnv(argv);
        } catch (cause) {
            throw new DaemonFailure(
                DaemonError.COMMAND_FAILED,
                `Could not start action '${action.name}': ${formatError(cause)}`,
            );
        }

        subprocess.wait_check_async(null, (_source, result) => {
            try {
                subprocess.wait_check_finish(result);
                this.logger.info(`Action '${action.name}' finished successfully`);
            } catch (cause) {
                this.logger.warn(`Action '${action.name}' failed: ${formatError(cause)}`);
            }
        });
    }
}
