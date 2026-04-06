import { PhpVersion } from '../dto/PhpVersion';

export class PhpListParser {
    parse(output: string): PhpVersion[] {
        if (!output || output.trim() === '') {
            return [];
        }

        const versions: PhpVersion[] = [];
        const lines = output.split('\n');

        // Try to find column positions if it's a table
        const headerLine = lines.find(l => l.includes('Version') && l.includes('Directory'));
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
                versions.push({ version, path, isDefault });
            }
        }

        return versions;
    }
}
