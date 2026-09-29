import Gio from 'gi://Gio';
import { ProcessRunnerInterface } from './interfaces/ProcessRunnerInterface.js';
import { LoggerInterface } from '../../shared/interfaces/LoggerInterface.js';
import { formatError } from '../../shared/errors.js';

/**
 * Runs subprocesses through Gio, which is the only place in the whole project
 * that spawns anything. Arguments are always passed as an argv vector, never as
 * a shell string, so no caller can inject a command through a directory name.
 */
export class GjsProcessRunner implements ProcessRunnerInterface {
    /**
     * @param resolveSymfonyBinary Called for every invocation rather than once,
     *        because the path is re-resolved whenever the extension changes the
     *        `symfony-path` setting. Throws when no binary is available.
     */
    constructor(
        private readonly logger: LoggerInterface,
        private readonly resolveSymfonyBinary: () => string,
    ) {}

    // `async` rather than returning the promise directly, so that a failure to
    // resolve the binary surfaces as a rejection instead of a synchronous throw.
    async run(args: string[]): Promise<string> {
        return this.runBinary(this.resolveSymfonyBinary(), args);
    }

    runBinary(binary: string, args: string[]): Promise<string> {
        const argv = [binary, ...args];
        const commandLine = argv.join(' ');

        this.logger.info(`Running command: ${commandLine}`);

        return new Promise((resolve, reject) => {
            let subprocess: Gio.Subprocess;
            try {
                subprocess = Gio.Subprocess.new(
                    argv,
                    Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE,
                );
            } catch (cause) {
                const message = `Failed to spawn '${commandLine}': ${formatError(cause)}`;
                this.logger.error(message);
                reject(new Error(message));
                return;
            }

            subprocess.communicate_utf8_async(null, null, (_source, result) => {
                let stdout: string | null;
                let stderr: string | null;

                try {
                    [, stdout, stderr] = subprocess.communicate_utf8_finish(result);
                } catch (cause) {
                    const message = `Failed to read output of '${commandLine}': ${formatError(cause)}`;
                    this.logger.error(message);
                    reject(new Error(message));
                    return;
                }

                // `get_exit_status()` may only be read once the process is known
                // to have exited normally; a process killed by a signal has to be
                // reported through `get_term_sig()` instead.
                if (!subprocess.get_if_exited()) {
                    const message =
                        `Command '${commandLine}' was terminated by signal ${subprocess.get_term_sig()}.`;
                    this.logger.error(message);
                    reject(new Error(message));
                    return;
                }

                const exitStatus = subprocess.get_exit_status();
                if (exitStatus !== 0) {
                    const message =
                        `Command '${commandLine}' exited with status ${exitStatus}. ` +
                        `Stderr: ${stderr?.trim() || 'no error output'}`;
                    this.logger.error(message);
                    reject(new Error(message));
                    return;
                }

                this.logger.debug(`Command '${commandLine}' succeeded.`);
                resolve(stdout ?? '');
            });
        });
    }
}
