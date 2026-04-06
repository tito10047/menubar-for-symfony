import { SymfonyCommandInterface } from '../interfaces/SymfonyCommandInterface';
import { ProcessRunnerInterface } from '../interfaces/ProcessRunnerInterface';
import { LoggerInterface } from '../interfaces/LoggerInterface';
import { SymfonyServer } from '../dto/SymfonyServer';
import { ServerListParser } from '../parsers/ServerListParser';

export type { SymfonyServer };

export class ServerListCommand implements SymfonyCommandInterface<SymfonyServer[]> {
    private logger?: LoggerInterface;
    private parser = new ServerListParser();

    constructor(private processRunner: ProcessRunnerInterface) {}

    getName(): string {
        return 'server:list';
    }

    setLogger(logger: LoggerInterface): void {
        this.logger = logger;
    }

    async execute(args: string[] = []): Promise<SymfonyServer[]> {
        const commandName = this.getName();
        this.logger?.info(`Executing command ${commandName}`);

        try {
            const output = await this.processRunner.run(['server:list', '--no-ansi', ...args]);
            const servers = this.parser.parse(output);

            if (servers.length === 0 && output.trim() !== '') {
                this.logger?.warn(`No servers found in output of ${commandName}`);
            }

            return servers;
        } catch (error) {
            this.logger?.error(`Command ${commandName} failed`, error);
            throw error;
        }
    }
}
