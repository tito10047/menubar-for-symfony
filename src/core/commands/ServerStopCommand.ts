import { SymfonyCommandInterface } from '../interfaces/SymfonyCommandInterface';
import { ProcessRunnerInterface } from '../interfaces/ProcessRunnerInterface';

export class ServerStopCommand implements SymfonyCommandInterface<boolean> {
    constructor(private processRunner: ProcessRunnerInterface) {}

    getName(): string {
        return 'server:stop';
    }

    async execute(args: string[] = []): Promise<boolean> {
        const commandArgs = ['server:stop', ...args];
        const output = await this.processRunner.run(commandArgs);
        const lowerOutput = output.toLowerCase();
        
        return lowerOutput.includes('stopped') || 
               lowerOutput.includes('no web server is running');
    }
}
