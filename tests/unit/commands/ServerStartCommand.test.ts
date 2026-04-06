import { ServerStartCommand } from '../../../src/core/commands/ServerStartCommand';
import { ProcessRunnerInterface } from '../../../src/core/interfaces/ProcessRunnerInterface';
import { LoggerInterface } from '../../../src/core/interfaces/LoggerInterface';

describe('ServerStartCommand', () => {
    let mockProcessRunner: jest.Mocked<ProcessRunnerInterface>;
    let mockLogger: jest.Mocked<LoggerInterface>;
    let command: ServerStartCommand;

    beforeEach(() => {
        mockProcessRunner = {
            run: jest.fn(),
        };
        mockLogger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        };
        command = new ServerStartCommand(mockProcessRunner);
        command.setLogger(mockLogger);
    });

    it('should have the correct name', () => {
        expect(command.getName()).toBe('server:start');
    });

    it('should return true if server just started listening', async () => {
        mockProcessRunner.run.mockResolvedValue('Web server listening on https://127.0.0.1:8000');

        const result = await command.execute(['/path/to/project']);

        expect(mockProcessRunner.run).toHaveBeenCalledWith(['server:start', '-d', '--dir', '/path/to/project']);
        expect(result).toBe(true);
    });

    it('should return true if server is already running', async () => {
        mockProcessRunner.run.mockResolvedValue('The web server is already running for this project');
        const result = await command.execute();
        expect(result).toBe(true);
    });

    it('should return true if server just started listening (alternative output)', async () => {
        mockProcessRunner.run.mockResolvedValue(' [OK] Web server listening');
        const result = await command.execute();
        expect(result).toBe(true);
    });
});
