import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import { ProcessRunnerInterface } from './interfaces/ProcessRunnerInterface';
import { LoggerInterface } from './interfaces/LoggerInterface';

export class GjsProcessRunner implements ProcessRunnerInterface {
    private binaryPath: string;

    constructor(private logger: LoggerInterface, binaryPath: string = 'symfony') {
        this.binaryPath = binaryPath;
    }

    async run(command: string[]): Promise<string> {
        let binary = this.binaryPath;
        let args = command;

        // If the first argument is an absolute path, use it as binary
        if (command.length > 0 && command[0].startsWith('/')) {
            binary = command[0];
            args = command.slice(1);
        }

        const fullArgs = [binary, ...args];
        const commandLine = fullArgs.join(' ');
        this.logger.info(`Running command: ${commandLine}`);

        return new Promise((resolve, reject) => {
            let proc: Gio.Subprocess;

            try {
                proc = Gio.Subprocess.new(
                    fullArgs,
                    Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
                );
            } catch (error) {
                const errorMessage = `Failed to create subprocess for command: ${commandLine}. Error: ${error}`;
                this.logger.error(errorMessage);
                return reject(new Error(errorMessage));
            }

            proc.communicate_utf8_async(null, null, (subprocess, result) => {
                try {
                    const [, stdout, stderr] = (subprocess as any).communicate_utf8_finish(result);

                    const status = (subprocess as any).get_exit_status();
                    const exited = (subprocess as any).get_if_exited();

                    if (!exited || status !== 0) {
                        const errorMessage = `Command '${commandLine}' exited with status ${status}. Stderr: ${stderr || 'no error output'}`;
                        this.logger.error(errorMessage);
                        return reject(new Error(errorMessage));
                    }

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
