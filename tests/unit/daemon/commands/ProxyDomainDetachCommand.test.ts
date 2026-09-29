import { ProxyDomainDetachCommand } from '../../../../src/daemon/core/commands/ProxyDomainDetachCommand';
import { ProcessRunnerInterface } from '../../../../src/daemon/core/interfaces/ProcessRunnerInterface';
import { LoggerInterface } from '../../../../src/shared/interfaces/LoggerInterface';

describe('ProxyDomainDetachCommand', () => {
    let mockProcessRunner: jest.Mocked<ProcessRunnerInterface>;
    let mockLogger: jest.Mocked<LoggerInterface>;
    let command: ProxyDomainDetachCommand;

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
        command = new ProxyDomainDetachCommand(mockProcessRunner);
        command.setLogger(mockLogger);
    });

    it('should have the correct name', () => {
        expect(command.getName()).toBe('proxy:domain:detach');
    });

    it('should return true if domain was detached', async () => {
        mockProcessRunner.run.mockResolvedValue('The domain my-site.wip has been detached');

        const result = await command.execute(['my-site.wip']);

        expect(mockProcessRunner.run).toHaveBeenCalledWith(['proxy:domain:detach', '--no-ansi', 'my-site.wip']);
        expect(result).toBe(true);
    });

    it('should return true if domain was not defined (already detached)', async () => {
        mockProcessRunner.run.mockResolvedValue('The following domains are not defined anymore on the proxy');
        const result = await command.execute(['non-existent']);
        expect(result).toBe(true);
    });
});
