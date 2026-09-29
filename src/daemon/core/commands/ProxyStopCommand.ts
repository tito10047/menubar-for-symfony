import { SymfonyCommandInterface } from '../interfaces/SymfonyCommandInterface.js';
import { ProcessRunnerInterface } from '../interfaces/ProcessRunnerInterface.js';
import { LoggerInterface } from '../../../shared/interfaces/LoggerInterface.js';

export class ProxyStopCommand implements SymfonyCommandInterface<boolean> {
    private logger?: LoggerInterface;

    constructor(private processRunner: ProcessRunnerInterface) {}

    getName(): string {
        return 'proxy:stop';
    }

    setLogger(logger: LoggerInterface): void {
        this.logger = logger;
    }

    async execute(args: string[] = []): Promise<boolean> {
        const commandName = this.getName();
        this.logger?.info(`Executing command ${commandName}`);

        try {
            const commandArgs = ['proxy:stop', '--no-ansi', ...args];
            const output = await this.processRunner.run(commandArgs);
            const lowerOutput = output.toLowerCase();
            
            const success = lowerOutput.includes('stopped') || 
                            lowerOutput.includes('not running');
            
            if (!success) {
                this.logger?.warn(`Command ${commandName} did not indicate clear success. Output: ${output}`);
            }

            return success;
        } catch (error) {
            this.logger?.error(`Command ${commandName} failed`, error);
            throw error;
        }
    }
}
