export interface ProcessRunnerInterface {
    /**
     * Runs the Symfony CLI with the given arguments and resolves with stdout.
     * Rejects when the process cannot be spawned or exits non-zero.
     */
    run(args: string[]): Promise<string>;

    /**
     * Runs an arbitrary binary. Used for the PHP binaries reported by
     * `local:php:list`, which are not reachable through the Symfony CLI.
     */
    runBinary(binary: string, args: string[]): Promise<string>;
}
