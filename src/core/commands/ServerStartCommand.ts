import { SymfonyCommandInterface } from '../interfaces/SymfonyCommandInterface';
import { ProcessRunnerInterface } from '../interfaces/ProcessRunnerInterface';

export class ServerStartCommand implements SymfonyCommandInterface<boolean> {
    constructor(private processRunner: ProcessRunnerInterface) {}

    getName(): string {
        return 'server:start';
    }

    async execute(args: string[] = []): Promise<boolean> {
        const commandArgs = ['server:start', '-d', ...args];
        await this.processRunner.run(commandArgs);
        return true;
    }
}
