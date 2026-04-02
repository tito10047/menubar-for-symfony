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

    it('should execute server:stop with correct arguments', async () => {
        mockProcessRunner.run.mockResolvedValue('Server stopped');

        const result = await command.execute(['--dir', '/path/to/project']);

        expect(mockProcessRunner.run).toHaveBeenCalledWith(['server:stop', '--dir', '/path/to/project']);
        expect(result).toBe(true);
    });
});
