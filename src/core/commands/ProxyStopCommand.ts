import { SymfonyCommandInterface } from '../interfaces/SymfonyCommandInterface';
import { ProcessRunnerInterface } from '../interfaces/ProcessRunnerInterface';

export class ProxyStopCommand implements SymfonyCommandInterface<boolean> {
    constructor(private processRunner: ProcessRunnerInterface) {}

    getName(): string {
        return 'proxy:stop';
    }

    async execute(args: string[] = []): Promise<boolean> {
        const commandArgs = ['proxy:stop', '--no-ansi', ...args];
        await this.processRunner.run(commandArgs);
        return true;
    }
}
