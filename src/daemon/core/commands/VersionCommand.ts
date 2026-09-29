import { SymfonyCommandInterface } from '../interfaces/SymfonyCommandInterface.js';
import { ProcessRunnerInterface } from '../interfaces/ProcessRunnerInterface.js';
import { VersionResponse } from '../../../shared/dto/VersionResponse.js';
import { LoggerInterface } from '../../../shared/interfaces/LoggerInterface.js';

export class VersionCommand implements SymfonyCommandInterface<VersionResponse> {
    private logger?: LoggerInterface;

    constructor(private processRunner: ProcessRunnerInterface) {}

    getName(): string {
        return 'version';
    }

    setLogger(logger: LoggerInterface): void {
        this.logger = logger;
    }

    async execute(args: string[] = []): Promise<VersionResponse> {
        const commandName = this.getName();
        this.logger?.info(`Executing command ${commandName}`);

        try {
            const commandArgs = ['version', '--no-ansi', ...args];
            const output = await this.processRunner.run(commandArgs);

            if (!output || output.trim() === '') {
                this.logger?.warn(`Empty output from ${commandName}`);
            }

            const match = output.match(/Symfony CLI (?:version|v)?\s*(\d+\.\d+\.\d+)/i);
            if (match) {
                return { version: match[1] };
            }

            this.logger?.warn(`Could not parse version from output: ${output}`);
            return { version: output.trim() };
        } catch (error) {
            this.logger?.error(`Command ${commandName} failed`, error);
            throw error;
        }
    }
}
