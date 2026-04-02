import { SymfonyCommandInterface } from '../interfaces/SymfonyCommandInterface';
import { ProcessRunnerInterface } from '../interfaces/ProcessRunnerInterface';

export class ProxyDomainDetachCommand implements SymfonyCommandInterface<boolean> {
    constructor(private processRunner: ProcessRunnerInterface) {}

    getName(): string {
        return 'proxy:domain:detach';
    }

    async execute(args: string[] = []): Promise<boolean> {
        const commandArgs = ['proxy:domain:detach', '--no-ansi', ...args];
        const output = await this.processRunner.run(commandArgs);
        const lowerOutput = output.toLowerCase();
        
        return lowerOutput.includes('detached') || 
               lowerOutput.includes('not defined anymore');
    }
}
