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

    it('should return true if proxy was stopped', async () => {
        mockProcessRunner.run.mockResolvedValue('The local proxy server has been stopped');
        const result = await command.execute();
        expect(result).toBe(true);
    });

    it('should return true if proxy was not running', async () => {
        mockProcessRunner.run.mockResolvedValue('The local proxy server is not running');
        const result = await command.execute();
        expect(result).toBe(true);
    });

    it('should return false if output is unknown', async () => {
        mockProcessRunner.run.mockResolvedValue('Some error happened');
        const result = await command.execute();
        expect(result).toBe(false);
    });
});
