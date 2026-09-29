import { ProxyStopCommand } from '../../../../src/daemon/core/commands/ProxyStopCommand';
import { ProcessRunnerInterface } from '../../../../src/daemon/core/interfaces/ProcessRunnerInterface';
import { LoggerInterface } from '../../../../src/shared/interfaces/LoggerInterface';

describe('ProxyStopCommand', () => {
    let mockProcessRunner: jest.Mocked<ProcessRunnerInterface>;
    let mockLogger: jest.Mocked<LoggerInterface>;
    let command: ProxyStopCommand;

    beforeEach(() => {
        mockProcessRunner = {
            run: jest.fn(),
            runBinary: jest.fn(),
        };
        mockLogger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        };
        command = new ProxyStopCommand(mockProcessRunner);
        command.setLogger(mockLogger);
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
