import { SymfonyCommandInterface } from '../interfaces/SymfonyCommandInterface';
import { ProcessRunnerInterface } from '../interfaces/ProcessRunnerInterface';
import { LoggerInterface } from '../interfaces/LoggerInterface';

export interface PhpVersion {
    version: string;
    path: string;
    isDefault: boolean;
}

export class PhpListCommand implements SymfonyCommandInterface<PhpVersion[]> {
    private logger?: LoggerInterface;

    constructor(private processRunner: ProcessRunnerInterface) {}

    getName(): string {
        return 'local:php:list';
    }

    setLogger(logger: LoggerInterface): void {
        this.logger = logger;
    }

    async execute(args: string[] = []): Promise<PhpVersion[]> {
        const commandName = this.getName();
        this.logger?.info(`Executing command ${commandName}`);

        try {
            const commandArgs = ['local:php:list', '--no-ansi', ...args];
            const output = await this.processRunner.run(commandArgs);

            if (!output || output.trim() === '') {
                this.logger?.warn(`No PHP versions found (empty output) for ${commandName}`);
            }

            const versions: PhpVersion[] = [];
            const lines = output.split('\n');
            
            // Try to find column positions if it's a table
            let headerLine = lines.find(l => l.includes('Version') && l.includes('Directory'));
            let versionIdx = -1, directoryIdx = -1, phpCliIdx = -1;

            if (headerLine) {
                const parts = headerLine.split('|').map(p => p.trim());
                versionIdx = parts.indexOf('Version');
                directoryIdx = parts.indexOf('Directory');
                phpCliIdx = parts.indexOf('PHP CLI');
            }

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('─') || trimmed.startsWith('┌') ||
                    trimmed.startsWith('└') || trimmed.startsWith('├') || 
                    trimmed.startsWith('+') || trimmed.startsWith('-') ||
                    trimmed.includes('Version')) {
                    continue;
                }

                let version = '';
                let path = '';
                let isDefault = false;

                if (versionIdx !== -1 && line.includes('|')) {
                    // Table parsing logic
                    const parts = line.split('|').map(p => p.trim());
                    version = parts[versionIdx].replace(/[*⭐]|\(default\)/g, '').trim();
                    isDefault = parts[versionIdx].includes('*') || 
                                parts[versionIdx].includes('⭐') || 
                                parts[versionIdx].toLowerCase().includes('default') ||
                                line.includes('*') || line.includes('⭐');
                    
                    const directory = directoryIdx !== -1 ? parts[directoryIdx] : '';
                    const phpCli = phpCliIdx !== -1 ? parts[phpCliIdx] : '';
                    
                    if (directory && phpCli) {
                        path = directory.endsWith('/') ? `${directory}${phpCli}` : `${directory}/${phpCli}`;
                    } else if (directory) {
                        path = directory;
                    } else if (phpCli) {
                        path = phpCli;
                    }
                } else {
                    // Fallback to regex for non-table output
                    const versionRegex = /(\d+\.\d+(?:\.\d+)?)/;
                    const pathRegex = /(\/[^\s│|]+)/;

                    const versionMatch = trimmed.match(versionRegex);
                    if (!versionMatch) continue;

                    version = versionMatch[1];
                    isDefault = trimmed.toLowerCase().includes('default') ||
                                trimmed.includes('*') ||
                                trimmed.includes('⭐');

                    const pathMatch = trimmed.match(pathRegex);
                    path = pathMatch ? pathMatch[1] : '';
                }

                if (version && !versions.find(v => v.version === version)) {
                    versions.push({
                        version,
                        path,
                        isDefault
                    });
                }
            }

            if (versions.length === 0 && output.trim() !== '') {
                this.logger?.warn(`No PHP versions found in output of ${commandName}`);
            }

            return versions;
        } catch (error) {
            this.logger?.error(`Command ${commandName} failed`, error);
            throw error;
        }
    }
}
