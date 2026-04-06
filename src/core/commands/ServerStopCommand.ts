import { SymfonyCommandInterface } from '../interfaces/SymfonyCommandInterface';
import { ProcessRunnerInterface } from '../interfaces/ProcessRunnerInterface';
import { LoggerInterface } from '../interfaces/LoggerInterface';

export class ServerStopCommand implements SymfonyCommandInterface<boolean> {
    private logger?: LoggerInterface;

    constructor(private processRunner: ProcessRunnerInterface) {}

    getName(): string {
        return 'server:stop';
    }

    setLogger(logger: LoggerInterface): void {
        this.logger = logger;
    }

    async execute(args: string[] = []): Promise<boolean> {
        const commandName = this.getName();
        this.logger?.info(`Executing command ${commandName}`);

        try {
            const commandArgs = args.length > 0
                ? ['server:stop', '--dir', args[0]]
                : ['server:stop'];
            const output = await this.processRunner.run(commandArgs);
            const lowerOutput = output.toLowerCase();
            
            const success = lowerOutput.includes('stopped') || 
                            lowerOutput.includes('no web server is running');
            
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
