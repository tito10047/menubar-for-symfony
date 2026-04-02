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

    it('should execute server:start with correct arguments', async () => {
        mockProcessRunner.run.mockResolvedValue('Server started');

        const result = await command.execute(['--dir', '/path/to/project']);

        expect(mockProcessRunner.run).toHaveBeenCalledWith(['server:start', '-d', '--dir', '/path/to/project']);
        expect(result).toBe(true);
    });
});
