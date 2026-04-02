import { ServerStartCommand } from '../../../src/core/commands/ServerStartCommand';
import { ProcessRunnerInterface } from '../../../src/core/interfaces/ProcessRunnerInterface';

describe('ServerStartCommand', () => {
    let mockProcessRunner: jest.Mocked<ProcessRunnerInterface>;
    let command: ServerStartCommand;

    beforeEach(() => {
        mockProcessRunner = {
            run: jest.fn(),
        };
        command = new ServerStartCommand(mockProcessRunner);
    });

    it('should have the correct name', () => {
        expect(command.getName()).toBe('server:start');
    });

    it('should return true if server just started listening', async () => {
        mockProcessRunner.run.mockResolvedValue('Web server listening on https://127.0.0.1:8000');

        const result = await command.execute(['--dir', '/path/to/project']);

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
