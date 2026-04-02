import { SymfonyCommandInterface } from '../interfaces/SymfonyCommandInterface';
import { ProcessRunnerInterface } from '../interfaces/ProcessRunnerInterface';
import { VersionResponse } from '../dto/VersionResponse';

export class VersionCommand implements SymfonyCommandInterface<VersionResponse> {
    constructor(private processRunner: ProcessRunnerInterface) {}

    getName(): string {
        return 'version';
    }

    async execute(args: string[] = []): Promise<VersionResponse> {
        const commandArgs = ['version', '--no-ansi', ...args];
        const output = await this.processRunner.run(commandArgs);

        const match = output.match(/Symfony CLI (?:version|v)?\s*(\d+\.\d+\.\d+)/i);
        if (match) {
            return { version: match[1] };
        }

        return { version: output.trim() };
    }
}
