import { SymfonyCommandInterface } from '../interfaces/SymfonyCommandInterface';
import { ProcessRunnerInterface } from '../interfaces/ProcessRunnerInterface';

export class ProxyStopCommand implements SymfonyCommandInterface<boolean> {
    constructor(private processRunner: ProcessRunnerInterface) {}

    getName(): string {
        return 'proxy:stop';
    }

    async execute(args: string[] = []): Promise<boolean> {
        const commandArgs = ['proxy:stop', '--no-ansi', ...args];
        const output = await this.processRunner.run(commandArgs);
        const lowerOutput = output.toLowerCase();
        
        return lowerOutput.includes('stopped') || 
               lowerOutput.includes('not running');
    }
}
