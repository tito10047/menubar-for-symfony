import { PhpInfoCommand } from '../../../src/core/commands/PhpInfoCommand';
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

    it('should parse php --ini and php -m output when called without arguments', async () => {
        const iniOutput = `
Configuration File (php.ini) Path: /etc/php/8.3/cli
Loaded Configuration File:         /etc/php/8.3/cli/php.ini
Scan for additional .ini files in: /etc/php/8.3/cli/conf.d
`;
        const modulesOutput = `
[PHP Modules]
apcu
Zend OPcache
[Zend Modules]
Xdebug
`;

        mockProcessRunner.run
            .mockResolvedValueOnce(iniOutput)
            .mockResolvedValueOnce(modulesOutput);

        const result = await command.execute();

        expect(mockProcessRunner.run).toHaveBeenCalledWith(['php', '--ini']);
        expect(mockProcessRunner.run).toHaveBeenCalledWith(['php', '-m']);

        expect(result).toEqual({
            phpIniPath: '/etc/php/8.3/cli/php.ini',
            hasXdebug: true,
            hasApcu: true,
            hasOpcache: true
        });
    });

    it('should still support passing PHP path directly for backward compatibility', async () => {
        const phpPath = '/usr/bin/php8.1';
        mockProcessRunner.run.mockResolvedValue('');

        await command.execute([phpPath]);

        expect(mockProcessRunner.run).toHaveBeenCalledWith([phpPath, '--ini']);
        expect(mockProcessRunner.run).toHaveBeenCalledWith([phpPath, '-m']);
    });

    it('should use specific php version binary (like /usr/bin/php8.3) if passed as path', async () => {
        const phpBin = '/usr/bin/php8.3';
        mockProcessRunner.run.mockResolvedValue('');

        await command.execute([phpBin]);

        expect(mockProcessRunner.run).toHaveBeenCalledWith([phpBin, '--ini']);
        expect(mockProcessRunner.run).toHaveBeenCalledWith([phpBin, '-m']);
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
        expect(mockProcessRunner.run).toHaveBeenCalledWith(['php', '-m']);
    });

    it('should handle missing modules and different ini path format', async () => {
        const phpPath = 'php';
        const iniOutput = `
Configuration File (php.ini) Path: /usr/local/etc/php/7.4
Loaded Configuration File:         (none)
Scan for additional .ini files in: /usr/local/etc/php/7.4/conf.d
`;
        const modulesOutput = `
[PHP Modules]
Core
date
pcre
`;

        mockProcessRunner.run
            .mockResolvedValueOnce(iniOutput)
            .mockResolvedValueOnce(modulesOutput);

        const result = await command.execute([phpPath]);

        expect(result).toEqual({
            phpIniPath: '/usr/local/etc/php/7.4', // falls back to path if loaded file is (none)
            hasXdebug: false,
            hasApcu: false,
            hasOpcache: false
        });
    });

});
