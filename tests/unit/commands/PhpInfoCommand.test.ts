import { PhpInfoCommand } from '../../../src/core/commands/PhpInfoCommand';
import { PhpExtensionStatus } from '../../../src/core/dto/PhpInfo';
import { ProcessRunnerInterface } from '../../../src/core/interfaces/ProcessRunnerInterface';
import { LoggerInterface } from '../../../src/core/interfaces/LoggerInterface';

describe('PhpInfoCommand', () => {
    let mockProcessRunner: jest.Mocked<ProcessRunnerInterface>;
    let mockLogger: jest.Mocked<LoggerInterface>;
    let command: PhpInfoCommand;

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
        command = new PhpInfoCommand(mockProcessRunner);
        command.setLogger(mockLogger);
    });

    it('should have the correct name', () => {
        expect(command.getName()).toBe('php:info');
    });

    it('should parse php --ini and php -r output when called without arguments', async () => {
        const iniOutput = `
Configuration File (php.ini) Path: /etc/php/8.3/cli
Loaded Configuration File:         /etc/php/8.3/cli/php.ini
Scan for additional .ini files in: /etc/php/8.3/cli/conf.d
`;
        const extensionOutput = `xdebug:1:1\napcu:1:1\nopcache:0:0\n`;

        mockProcessRunner.run
            .mockResolvedValueOnce(iniOutput)
            .mockResolvedValueOnce(extensionOutput);

        const result = await command.execute();

        expect(mockProcessRunner.run).toHaveBeenCalledWith(['php', '--ini']);
        expect(mockProcessRunner.run).toHaveBeenCalledWith(
            expect.arrayContaining(['php', '-r', expect.any(String)])
        );

        expect(result).toEqual({
            phpIniPath: '/etc/php/8.3/cli/php.ini',
            xdebug:  PhpExtensionStatus.ENABLED,
            apcu:    PhpExtensionStatus.ENABLED,
            opcache: PhpExtensionStatus.NOT_INSTALLED,
        });
    });

    it('should still support passing PHP path directly for backward compatibility', async () => {
        const phpPath = '/usr/bin/php8.1';
        mockProcessRunner.run.mockResolvedValue('');

        await command.execute([phpPath]);

        expect(mockProcessRunner.run).toHaveBeenCalledWith([phpPath, '--ini']);
        expect(mockProcessRunner.run).toHaveBeenCalledWith(
            expect.arrayContaining([phpPath, '-r', expect.any(String)])
        );
    });

    it('should use specific php version binary (like /usr/bin/php8.3) if passed as path', async () => {
        const phpBin = '/usr/bin/php8.3';
        mockProcessRunner.run.mockResolvedValue('');

        await command.execute([phpBin]);

        expect(mockProcessRunner.run).toHaveBeenCalledWith([phpBin, '--ini']);
        expect(mockProcessRunner.run).toHaveBeenCalledWith(
            expect.arrayContaining([phpBin, '-r', expect.any(String)])
        );
    });

    it('should log warning if version string is passed instead of path', async () => {
        const phpVersion = '8.3';
        mockProcessRunner.run.mockResolvedValue('');

        await command.execute([phpVersion]);

        expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('received version 8.3 instead of path'));
        expect(mockProcessRunner.run).toHaveBeenCalledWith(['8.3', '--ini']);
    });

    it('should use default php when an empty string is passed as path', async () => {
        mockProcessRunner.run.mockResolvedValue('');

        await command.execute(['']);

        expect(mockProcessRunner.run).toHaveBeenCalledWith(['php', '--ini']);
        expect(mockProcessRunner.run).toHaveBeenCalledWith(
            expect.arrayContaining(['php', '-r', expect.any(String)])
        );
    });

    it('should handle missing modules and different ini path format', async () => {
        const iniOutput = `
Configuration File (php.ini) Path: /usr/local/etc/php/7.4
Loaded Configuration File:         (none)
Scan for additional .ini files in: /usr/local/etc/php/7.4/conf.d
`;
        const extensionOutput = `xdebug:0:0\napcu:0:0\nopcache:0:0\n`;

        mockProcessRunner.run
            .mockResolvedValueOnce(iniOutput)
            .mockResolvedValueOnce(extensionOutput);

        const result = await command.execute(['php']);

        expect(result).toEqual({
            phpIniPath: '/usr/local/etc/php/7.4', // falls back to path if loaded file is (none)
            xdebug:  PhpExtensionStatus.NOT_INSTALLED,
            apcu:    PhpExtensionStatus.NOT_INSTALLED,
            opcache: PhpExtensionStatus.NOT_INSTALLED,
        });
    });

    it('should return INSTALLED when extension .so exists but is not loaded', async () => {
        mockProcessRunner.run
            .mockResolvedValueOnce('Loaded Configuration File: /etc/php.ini\n')
            .mockResolvedValueOnce('xdebug:1:0\napcu:0:0\nopcache:1:0\n');

        const result = await command.execute();

        expect(result.xdebug).toBe(PhpExtensionStatus.INSTALLED);
        expect(result.apcu).toBe(PhpExtensionStatus.NOT_INSTALLED);
        expect(result.opcache).toBe(PhpExtensionStatus.INSTALLED);
    });

    it('should return ENABLED when extension .so exists and is loaded', async () => {
        mockProcessRunner.run
            .mockResolvedValueOnce('Loaded Configuration File: /etc/php.ini\n')
            .mockResolvedValueOnce('xdebug:1:1\napcu:1:1\nopcache:1:1\n');

        const result = await command.execute();

        expect(result.xdebug).toBe(PhpExtensionStatus.ENABLED);
        expect(result.apcu).toBe(PhpExtensionStatus.ENABLED);
        expect(result.opcache).toBe(PhpExtensionStatus.ENABLED);
    });

    it('should return NOT_INSTALLED for all extensions when output is empty', async () => {
        mockProcessRunner.run
            .mockResolvedValueOnce('Loaded Configuration File: /etc/php.ini\n')
            .mockResolvedValueOnce('');

        const result = await command.execute();

        expect(result.xdebug).toBe(PhpExtensionStatus.NOT_INSTALLED);
        expect(result.apcu).toBe(PhpExtensionStatus.NOT_INSTALLED);
        expect(result.opcache).toBe(PhpExtensionStatus.NOT_INSTALLED);
    });

    it('should handle mixed states in the same output', async () => {
        mockProcessRunner.run
            .mockResolvedValueOnce('Loaded Configuration File: /etc/php.ini\n')
            .mockResolvedValueOnce('xdebug:1:0\napcu:1:1\nopcache:0:0\n');

        const result = await command.execute();

        expect(result.xdebug).toBe(PhpExtensionStatus.INSTALLED);
        expect(result.apcu).toBe(PhpExtensionStatus.ENABLED);
        expect(result.opcache).toBe(PhpExtensionStatus.NOT_INSTALLED);
    });
});
