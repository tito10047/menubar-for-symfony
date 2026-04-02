import { ProxyDomainDetachCommand } from '../../../src/core/commands/ProxyDomainDetachCommand';
import { ProcessRunnerInterface } from '../../../src/core/interfaces/ProcessRunnerInterface';

describe('ProxyDomainDetachCommand', () => {
    let mockProcessRunner: jest.Mocked<ProcessRunnerInterface>;
    let command: ProxyDomainDetachCommand;

    beforeEach(() => {
        mockProcessRunner = {
            run: jest.fn(),
        };
        command = new ProxyDomainDetachCommand(mockProcessRunner);
    });

    it('should have the correct name', () => {
        expect(command.getName()).toBe('proxy:domain:detach');
    });

    it('should execute proxy:domain:detach with domain', async () => {
        mockProcessRunner.run.mockResolvedValue('Domain detached');

        const result = await command.execute(['my-site.wip']);

        expect(mockProcessRunner.run).toHaveBeenCalledWith(['proxy:domain:detach', '--no-ansi', 'my-site.wip']);
        expect(result).toBe(true);
    });
});
