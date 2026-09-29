import { execFile } from 'child_process';
import { ProcessRunnerInterface } from '../../src/daemon/core/interfaces/ProcessRunnerInterface';

/**
 * Implements ProcessRunnerInterface with Node's child_process, for integration
 * tests that exercise the command classes against the real Symfony CLI. The
 * production implementation is GjsProcessRunner, which cannot run under Node.
 */
export class NodeProcessRunner implements ProcessRunnerInterface {
    constructor(private readonly symfonyBinary: string = 'symfony') {}

    run(args: string[]): Promise<string> {
        return this.runBinary(this.symfonyBinary, args);
    }

    runBinary(binary: string, args: string[]): Promise<string> {
        const isDebug = process.env.DEBUG === '1';
        if (isDebug) {
            process.stderr.write(`\n[DEBUG] Running command: ${binary} ${args.join(' ')}\n`);
        }

        return new Promise((resolve, reject) => {
            execFile(binary, args, (error, stdout, stderr) => {
                if (isDebug && stdout) process.stderr.write(`[DEBUG] STDOUT:\n${stdout}\n`);
                if (isDebug && stderr) process.stderr.write(`[DEBUG] STDERR:\n${stderr}\n`);

                if (error) {
                    // Written straight to stderr to bypass Jest's log capture.
                    process.stderr.write('\n--- SUBPROCESS ERROR ---\n');
                    process.stderr.write(`Command: ${binary} ${args.join(' ')}\n`);
                    process.stderr.write(`Exit code: ${error.code}\n`);
                    if (stderr) process.stderr.write(`STDERR:\n${stderr}\n`);
                    if (stdout) process.stderr.write(`STDOUT:\n${stdout}\n`);
                    process.stderr.write('--- END SUBPROCESS ERROR ---\n\n');

                    reject(new Error(`Command failed with code ${error.code}: ${stderr || stdout || error.message}`));
                    return;
                }
                resolve(stdout);
            });
        });
    }
}
