import { SymfonyCommandInterface } from '../interfaces/SymfonyCommandInterface';
import { ProcessRunnerInterface } from '../interfaces/ProcessRunnerInterface';
import { LoggerInterface } from '../interfaces/LoggerInterface';
import { PhpInfo } from '../dto/PhpInfo';

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

        const runArgsIni = [phpBin, '--ini'];
        const runArgsM = [phpBin, '-m'];

        this.logger?.info(`Executing command ${commandName} using binary: ${phpBin}`);

        try {
            const iniOutput = await this.processRunner.run(runArgsIni);
            const modulesOutput = await this.processRunner.run(runArgsM);

            const phpIniPath = this.parseIniPath(iniOutput);
            const modules = modulesOutput.toLowerCase();

            return {
                phpIniPath,
                hasXdebug: modules.includes('xdebug'),
                hasApcu: modules.includes('apcu'),
                hasOpcache: modules.includes('opcache')
            };
        } catch (error) {
            this.logger?.error(`Command ${commandName} failed`, error);
            throw error;
        }
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
