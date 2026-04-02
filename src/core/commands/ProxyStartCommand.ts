import { SymfonyCommandInterface } from '../interfaces/SymfonyCommandInterface';
import { ProcessRunnerInterface } from '../interfaces/ProcessRunnerInterface';

export class ProxyStartCommand implements SymfonyCommandInterface<boolean> {
    constructor(private processRunner: ProcessRunnerInterface) {}

    getName(): string {
        return 'proxy:start';
    }

    async execute(args: string[] = []): Promise<boolean> {
        const commandArgs = ['proxy:start', '--no-ansi', ...args];
        await this.processRunner.run(commandArgs);
        return true;
    }
}
