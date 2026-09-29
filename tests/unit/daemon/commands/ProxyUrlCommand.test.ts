import { ProxyUrlCommand } from '../../../../src/daemon/core/commands/ProxyUrlCommand';
import { ProcessRunnerInterface } from '../../../../src/daemon/core/interfaces/ProcessRunnerInterface';
import { LoggerInterface } from '../../../../src/shared/interfaces/LoggerInterface';

describe('ProxyUrlCommand', () => {
    let mockProcessRunner: jest.Mocked<ProcessRunnerInterface>;
    let mockLogger: jest.Mocked<LoggerInterface>;
    let command: ProxyUrlCommand;

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
        command = new ProxyUrlCommand(mockProcessRunner);
        command.setLogger(mockLogger);
    });

    it('should have the correct name', () => {
        expect(command.getName()).toBe('proxy:url');
    });

    it('should call processRunner with correct arguments', async () => {
        mockProcessRunner.run.mockResolvedValue('https://127.0.0.1:7080');
        await command.execute();
        expect(mockProcessRunner.run).toHaveBeenCalledWith(['proxy:url', '--no-ansi']);
    });

    it('should return a trimmed URL when proxy is running', async () => {
        mockProcessRunner.run.mockResolvedValue('https://127.0.0.1:7080\n');
        const result = await command.execute();
        expect(result).toBe('https://127.0.0.1:7080');
    });

    it('should return an empty string when output is only whitespace', async () => {
        mockProcessRunner.run.mockResolvedValue('   \n  ');
        const result = await command.execute();
        expect(result).toBe('');
    });

    it('should propagate errors thrown by the process runner', async () => {
        const error = new Error('process failed');
        mockProcessRunner.run.mockRejectedValue(error);
        await expect(command.execute()).rejects.toThrow('process failed');
    });
});
