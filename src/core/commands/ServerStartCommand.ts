import { SymfonyCommandInterface } from '../interfaces/SymfonyCommandInterface';
import { ProcessRunnerInterface } from '../interfaces/ProcessRunnerInterface';
import { LoggerInterface } from '../interfaces/LoggerInterface';

export class ServerStartCommand implements SymfonyCommandInterface<boolean> {
    private logger?: LoggerInterface;

    constructor(private processRunner: ProcessRunnerInterface) {}

    getName(): string {
        return 'server:start';
    }

    setLogger(logger: LoggerInterface): void {
        this.logger = logger;
    }

    async execute(args: string[] = []): Promise<boolean> {
        const commandName = this.getName();
        this.logger?.info(`Executing command ${commandName}`);

        try {
            const commandArgs = args.length > 0
                ? ['server:start', '-d', '--dir', args[0]]
                : ['server:start', '-d'];
            const output = await this.processRunner.run(commandArgs);
            const lowerOutput = output.toLowerCase();
            
            const success = lowerOutput.includes('listening') || 
                            lowerOutput.includes('already running');
            
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
