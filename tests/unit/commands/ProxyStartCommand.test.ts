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

    it('should return true if proxy is already running', async () => {
        mockProcessRunner.run.mockResolvedValue('The proxy server is already running at port 7080');
        const result = await command.execute();
        expect(result).toBe(true);
    });

    it('should return true if proxy just started listening', async () => {
        mockProcessRunner.run.mockResolvedValue('The local proxy server is now listening on http://127.0.0.1:7080');
        const result = await command.execute();
        expect(result).toBe(true);
    });

    it('should return false if output is unknown', async () => {
        mockProcessRunner.run.mockResolvedValue('Some error happened');
        const result = await command.execute();
        expect(result).toBe(false);
    });
});
