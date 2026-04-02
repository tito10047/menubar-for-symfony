import { ProxyStartCommand } from '../../../src/core/commands/ProxyStartCommand';
import { ProcessRunnerInterface } from '../../../src/core/interfaces/ProcessRunnerInterface';

describe('ProxyStartCommand', () => {
    let mockProcessRunner: jest.Mocked<ProcessRunnerInterface>;
    let command: ProxyStartCommand;

    beforeEach(() => {
        mockProcessRunner = {
            run: jest.fn(),
        };
        command = new ProxyStartCommand(mockProcessRunner);
    });

    it('should have the correct name', () => {
        expect(command.getName()).toBe('proxy:start');
    });

    it('should execute proxy:start', async () => {
        mockProcessRunner.run.mockResolvedValue('Proxy started');

        const result = await command.execute();

        expect(mockProcessRunner.run).toHaveBeenCalledWith(['proxy:start', '--no-ansi']);
        expect(result).toBe(true);
    });
});
