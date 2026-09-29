import { SymfonyCommandInterface } from '../interfaces/SymfonyCommandInterface.js';
import { ProcessRunnerInterface } from '../interfaces/ProcessRunnerInterface.js';
import { LoggerInterface } from '../../../shared/interfaces/LoggerInterface.js';
import { SymfonyProxy, ProxyStatus } from '../../../shared/dto/ProxyStatus.js';
import { ProxyStatusParser } from '../parsers/ProxyStatusParser';

export type { SymfonyProxy, ProxyStatus };

export class ProxyStatusCommand implements SymfonyCommandInterface<ProxyStatus> {
    private logger?: LoggerInterface;
    private parser = new ProxyStatusParser();

    constructor(private processRunner: ProcessRunnerInterface) {}

    getName(): string {
        return 'proxy:status';
    }

    setLogger(logger: LoggerInterface): void {
        this.logger = logger;
    }

    async execute(args: string[] = []): Promise<ProxyStatus> {
        const commandName = this.getName();
        this.logger?.info(`Executing command ${commandName}`);

        try {
            const output = await this.processRunner.run(['proxy:status', '--no-ansi', ...args]);
            return this.parser.parse(output);
        } catch (error) {
            this.logger?.error(`Command ${commandName} failed`, error);
            throw error;
        }
    }
}
