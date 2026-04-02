import { ProxyStopCommand } from '../../../src/core/commands/ProxyStopCommand';
import { ProcessRunnerInterface } from '../../../src/core/interfaces/ProcessRunnerInterface';

describe('ProxyStopCommand', () => {
    let mockProcessRunner: jest.Mocked<ProcessRunnerInterface>;
    let command: ProxyStopCommand;

    beforeEach(() => {
        mockProcessRunner = {
            run: jest.fn(),
        };
        command = new ProxyStopCommand(mockProcessRunner);
    });

    it('should have the correct name', () => {
        expect(command.getName()).toBe('proxy:stop');
    });

    it('should execute proxy:stop', async () => {
        mockProcessRunner.run.mockResolvedValue('Proxy stopped');

        const result = await command.execute();

        expect(mockProcessRunner.run).toHaveBeenCalledWith(['proxy:stop', '--no-ansi']);
        expect(result).toBe(true);
    });
});
