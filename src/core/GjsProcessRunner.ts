import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import { ProcessRunnerInterface } from './interfaces/ProcessRunnerInterface';
import { LoggerInterface } from './interfaces/LoggerInterface';

/**
 * GjsProcessRunner implements ProcessRunnerInterface using GNOME's native Gio.Subprocess.
 * This class is designed to run in a GJS (GNOME JavaScript) environment.
 */
export class GjsProcessRunner implements ProcessRunnerInterface {
    /**
     * @param logger The logger to record command execution and results.
     */
    constructor(private logger: LoggerInterface) {}

    /**
     * Executes a command with arguments asynchronously and returns the stdout.
     * 
     * @param args Array containing the command and its arguments (e.g., ['ls', '-la']).
     * @returns A promise that resolves to the stdout string on success.
     * @throws Error if the process fails or returns a non-zero exit code.
     */
    async run(args: string[]): Promise<string> {
        const commandLine = args.join(' ');
        this.logger.info(`Running command: ${commandLine}`);

        return new Promise((resolve, reject) => {
            let proc: Gio.Subprocess;

            try {
                // Create a new subprocess with stdout and stderr pipes.
                // This might throw if the binary is not found in PATH or other OS errors occur.
                proc = Gio.Subprocess.new(
                    args,
                    Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
                );
            } catch (error) {
                const errorMessage = `Failed to create subprocess for command: ${commandLine}. Error: ${error}`;
                this.logger.error(errorMessage);
                return reject(new Error(errorMessage));
            }

            // Communicate with the subprocess asynchronously.
            // This reads stdout and stderr to completion.
            proc.communicate_utf8_async(null, null, (subprocess, result) => {
                try {
                    // Get the result of the communication.
                    // In GJS, communicate_utf8_finish returns [stdout, stderr] or throws an error.
                    const [stdout, stderr] = (subprocess as any).communicate_utf8_finish(result);

                    // Check if the process exited successfully (exit code 0).
                    const status = (subprocess as any).get_exit_status();
                    const exited = (subprocess as any).get_if_exited();

                    if (!exited || status !== 0) {
                        const errorMessage = `Command '${commandLine}' exited with status ${status}. Stderr: ${stderr || 'no error output'}`;
                        this.logger.error(errorMessage);
                        return reject(new Error(errorMessage));
                    }

                    // Resolve with stdout on success.
                    this.logger.debug(`Command '${commandLine}' executed successfully.`);
                    resolve(stdout || '');
                } catch (error) {
                    const errorMessage = `Error reading output of command: ${commandLine}. Error: ${error}`;
                    this.logger.error(errorMessage);
                    reject(new Error(errorMessage));
                }
            });
        });
    }
}
