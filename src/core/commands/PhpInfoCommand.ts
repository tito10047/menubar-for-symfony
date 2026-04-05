import { SymfonyCommandInterface } from '../interfaces/SymfonyCommandInterface';
import { ProcessRunnerInterface } from '../interfaces/ProcessRunnerInterface';
import { LoggerInterface } from '../interfaces/LoggerInterface';
import { PhpInfo, PhpExtensionStatus } from '../dto/PhpInfo';

const EXTENSION_STATUS_SCRIPT =
    `$dir = ini_get('extension_dir'); ` +
    `$loaded = array_map('strtolower', get_loaded_extensions()); ` +
    `foreach(['xdebug','apcu','opcache'] as $e) { ` +
    `$inst = file_exists($dir.'/'.$e.'.so') ? 1 : 0; ` +
    `$enab = in_array($e, $loaded) ? 1 : 0; ` +
    `echo $e.':'.$inst.':'.$enab.PHP_EOL; ` +
    `}`;

export class PhpInfoCommand implements SymfonyCommandInterface<PhpInfo> {
    private logger?: LoggerInterface;

    constructor(private processRunner: ProcessRunnerInterface) {}

    getName(): string {
        return 'php:info';
    }

    setLogger(logger: LoggerInterface): void {
        this.logger = logger;
    }

    async execute(args: string[] = []): Promise<PhpInfo> {
        const commandName = this.getName();

        // Use 'php' as default or provided argument (if not empty)
        let phpBin = (args.length > 0 && args[0].trim() !== '') ? args[0] : 'php';

        // If it looks like a version number (e.g. 8.3 or 8.3.30), we'll have to rely on
        // extension.ts passing the full path, but if we get a version here, we can
        // try to be smart or just log it.
        if (phpBin.match(/^\d+\.\d+/)) {
            this.logger?.warn(`PhpInfoCommand received version ${phpBin} instead of path. Trying to use it as is.`);
        }

        this.logger?.info(`Executing command ${commandName} using binary: ${phpBin}`);

        try {
            const iniOutput       = await this.processRunner.run([phpBin, '--ini']);
            const extensionOutput = await this.processRunner.run([phpBin, '-r', EXTENSION_STATUS_SCRIPT]);

            const phpIniPath = this.parseIniPath(iniOutput);

            return {
                phpIniPath,
                xdebug:  this.parseExtensionStatus('xdebug',  extensionOutput),
                apcu:    this.parseExtensionStatus('apcu',    extensionOutput),
                opcache: this.parseExtensionStatus('opcache', extensionOutput),
            };
        } catch (error) {
            this.logger?.error(`Command ${commandName} failed`, error);
            throw error;
        }
    }

    private parseExtensionStatus(name: string, output: string): PhpExtensionStatus {
        const match = output.match(new RegExp(`^${name}:(\\d):(\\d)`, 'm'));
        if (!match) return PhpExtensionStatus.NOT_INSTALLED;
        const enabled   = match[2] === '1';
        const installed = match[1] === '1';
        if (enabled)   return PhpExtensionStatus.ENABLED;
        if (installed) return PhpExtensionStatus.INSTALLED;
        return PhpExtensionStatus.NOT_INSTALLED;
    }

    private parseIniPath(output: string): string {
        const loadedMatch = output.match(/Loaded Configuration File:\s+(.+)/);
        if (loadedMatch && loadedMatch[1].trim() !== '(none)') {
            return loadedMatch[1].trim();
        }

        const pathMatch = output.match(/Configuration File \(php\.ini\) Path:\s+(.+)/);
        if (pathMatch) {
            return pathMatch[1].trim();
        }

        return '';
    }
}
