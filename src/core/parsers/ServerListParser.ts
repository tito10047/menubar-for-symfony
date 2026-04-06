import { SymfonyServer } from '../dto/SymfonyServer';

export class ServerListParser {
    parse(output: string): SymfonyServer[] {
        if (!output || output.trim() === '') {
            return [];
        }

        const servers: SymfonyServer[] = [];
        const lines = output.split('\n');

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('+') || trimmed.startsWith('-') ||
                trimmed.includes('Directory') || !trimmed.includes('|')) {
                continue;
            }

            const columns = trimmed.split('|')
                .map(c => c.trim())
                .filter(c => c !== '');

            if (columns.length < 2) continue;

            const directory = columns[0];
            const portStr = columns[1];
            const domain = columns.length >= 3 && columns[2] ? columns[2] : undefined;

            let port = 8000;
            let isRunning = false;

            if (portStr.toLowerCase() === 'not running') {
                isRunning = false;
            } else {
                const p = parseInt(portStr, 10);
                if (!isNaN(p)) {
                    port = p;
                    isRunning = true;
                }
            }

            const url = isRunning
                ? (domain ? `https://${domain}` : `https://127.0.0.1:${port}`)
                : '';

            servers.push({ directory, port, url, domain, isRunning });
        }

        return servers;
    }
}
