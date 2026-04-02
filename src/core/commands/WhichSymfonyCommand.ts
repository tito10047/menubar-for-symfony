import { SymfonyCommandInterface } from '../interfaces/SymfonyCommandInterface';
import { ProcessRunnerInterface } from '../interfaces/ProcessRunnerInterface';
import { WhichResponse } from '../dto/WhichResponse';

export class WhichSymfonyCommand implements SymfonyCommandInterface<WhichResponse> {
    constructor(private processRunner: ProcessRunnerInterface) {}

    getName(): string {
        return 'which';
    }

    async execute(args: string[] = []): Promise<WhichResponse> {
        try {
            const output = await this.processRunner.run(['/usr/bin/which', 'symfony']);
            return { path: output.trim() };
        } catch (e) {
            return { path: null };
        }
    }
}
