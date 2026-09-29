import { SymfonyCommandInterface } from '../interfaces/SymfonyCommandInterface.js';
import { ProcessRunnerInterface } from '../interfaces/ProcessRunnerInterface.js';
import { LoggerInterface } from '../../../shared/interfaces/LoggerInterface.js';
import { PhpInfo, PhpExtensionStatus } from '../../../shared/dto/PhpInfo.js';

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

    /**
     * @param args A single element: the path to the PHP binary to inspect, as
     *             reported by `local:php:list`.
     */
    async execute(args: string[] = []): Promise<PhpInfo> {
        const commandName = this.getName();

        const phpBinary = args[0];
        if (phpBinary === undefined || phpBinary.trim() === '') {
            throw new Error(`Command ${commandName} requires the path to a PHP binary`);
        }

        this.logger?.info(`Executing command ${commandName} using binary: ${phpBinary}`);

        try {
            const iniOutput       = await this.processRunner.runBinary(phpBinary, ['--ini']);
            const extensionOutput = await this.processRunner.runBinary(phpBinary, ['-r', EXTENSION_STATUS_SCRIPT]);

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
