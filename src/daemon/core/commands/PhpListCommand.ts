import { SymfonyCommandInterface } from '../interfaces/SymfonyCommandInterface.js';
import { ProcessRunnerInterface } from '../interfaces/ProcessRunnerInterface.js';
import { LoggerInterface } from '../../../shared/interfaces/LoggerInterface.js';
import { PhpVersion } from '../../../shared/dto/PhpVersion.js';
import { PhpListParser } from '../parsers/PhpListParser';

export type { PhpVersion };

export class PhpListCommand implements SymfonyCommandInterface<PhpVersion[]> {
    private logger?: LoggerInterface;
    private parser = new PhpListParser();

    constructor(private processRunner: ProcessRunnerInterface) {}

    getName(): string {
        return 'local:php:list';
    }

    setLogger(logger: LoggerInterface): void {
        this.logger = logger;
    }

    async execute(args: string[] = []): Promise<PhpVersion[]> {
        const commandName = this.getName();
        this.logger?.info(`Executing command ${commandName}`);

        try {
            const output = await this.processRunner.run(['local:php:list', '--no-ansi', ...args]);

            if (!output || output.trim() === '') {
                this.logger?.warn(`No PHP versions found (empty output) for ${commandName}`);
                return [];
            }

            const versions = this.parser.parse(output);

            if (versions.length === 0 && output.trim() !== '') {
                this.logger?.warn(`No PHP versions found in output of ${commandName}`);
            }

            return versions;
        } catch (error) {
            this.logger?.error(`Command ${commandName} failed`, error);
            throw error;
        }
    }
}
