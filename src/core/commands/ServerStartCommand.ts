import { SymfonyCommandInterface } from '../interfaces/SymfonyCommandInterface';
import { ProcessRunnerInterface } from '../interfaces/ProcessRunnerInterface';

export class ServerStartCommand implements SymfonyCommandInterface<boolean> {
    constructor(private processRunner: ProcessRunnerInterface) {}

    getName(): string {
        return 'server:start';
    }

    async execute(args: string[] = []): Promise<boolean> {
        const commandArgs = ['server:start', '-d', ...args];
        const output = await this.processRunner.run(commandArgs);
        const lowerOutput = output.toLowerCase();
        
        return lowerOutput.includes('listening') || 
               lowerOutput.includes('already running');
    }
}
