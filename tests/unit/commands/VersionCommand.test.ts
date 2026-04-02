import { VersionCommand } from '../../../src/core/commands/VersionCommand';
import { ProcessRunnerInterface } from '../../../src/core/interfaces/ProcessRunnerInterface';

describe('VersionCommand', () => {
    let mockProcessRunner: jest.Mocked<ProcessRunnerInterface>;
    let command: VersionCommand;

    beforeEach(() => {
        mockProcessRunner = {
            run: jest.fn(),
        };
        command = new VersionCommand(mockProcessRunner);
    });

    it('should have the correct name', () => {
        expect(command.getName()).toBe('version');
    });

    it('should return the version string', async () => {
        const mockOutput = 'Symfony CLI 5.4.21 (2023-01-26T14:44:17Z)';
        mockProcessRunner.run.mockResolvedValue(mockOutput);

        const result = await command.execute();

        expect(mockProcessRunner.run).toHaveBeenCalledWith(['version', '--no-ansi']);
        expect(result).toEqual({ version: '5.4.21' });
    });

    it('should handle version with v prefix', async () => {
        const mockOutput = 'Symfony CLI v5.4.21 (2023-01-26T14:44:17Z)';
        mockProcessRunner.run.mockResolvedValue(mockOutput);

        const result = await command.execute();

        expect(result).toEqual({ version: '5.4.21' });
    });

    it('should return raw output if version not found', async () => {
        const mockOutput = 'Unknown format';
        mockProcessRunner.run.mockResolvedValue(mockOutput);

        const result = await command.execute();

        expect(result).toEqual({ version: 'Unknown format' });
    });
});
