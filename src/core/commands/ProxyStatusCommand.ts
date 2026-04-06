import { SymfonyCommandInterface } from '../interfaces/SymfonyCommandInterface';
import { ProcessRunnerInterface } from '../interfaces/ProcessRunnerInterface';
import { LoggerInterface } from '../interfaces/LoggerInterface';
import { SymfonyProxy, ProxyStatus } from '../dto/ProxyStatus';
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
