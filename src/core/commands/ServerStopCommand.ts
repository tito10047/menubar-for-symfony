import { SymfonyCommandInterface } from '../interfaces/SymfonyCommandInterface';
import { ProcessRunnerInterface } from '../interfaces/ProcessRunnerInterface';

export class ServerStopCommand implements SymfonyCommandInterface<boolean> {
    constructor(private processRunner: ProcessRunnerInterface) {}

    getName(): string {
        return 'server:stop';
    }

    async execute(args: string[] = []): Promise<boolean> {
        const commandArgs = ['server:stop', ...args];
        await this.processRunner.run(commandArgs);
        return true;
    }
}
