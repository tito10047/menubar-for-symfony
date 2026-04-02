import { ServerStopCommand } from '../../../src/core/commands/ServerStopCommand';
import { ProcessRunnerInterface } from '../../../src/core/interfaces/ProcessRunnerInterface';

describe('ServerStopCommand', () => {
    let mockProcessRunner: jest.Mocked<ProcessRunnerInterface>;
    let command: ServerStopCommand;

    beforeEach(() => {
        mockProcessRunner = {
            run: jest.fn(),
        };
        command = new ServerStopCommand(mockProcessRunner);
    });

    it('should have the correct name', () => {
        expect(command.getName()).toBe('server:stop');
    });

    it('should return true if server was stopped', async () => {
        mockProcessRunner.run.mockResolvedValue('The web server has been stopped');

        const result = await command.execute(['--dir', '/path/to/project']);

        expect(mockProcessRunner.run).toHaveBeenCalledWith(['server:stop', '--dir', '/path/to/project']);
        expect(result).toBe(true);
    });

    it('should return true if no server is running', async () => {
        mockProcessRunner.run.mockResolvedValue('No web server is running for this project');
        const result = await command.execute();
        expect(result).toBe(true);
    });

    it('should return false if output is unknown', async () => {
        mockProcessRunner.run.mockResolvedValue('Some error happened');
        const result = await command.execute();
        expect(result).toBe(false);
    });
});
