import { ProxyStatus } from '../dto/ProxyStatus';

const DOMAIN_REGEX = /([a-zA-Z0-9.\-]+\.wip)/;
const PATH_REGEX = /([~/][^\s|│]+)/;

export class ProxyStatusParser {
    parse(output: string): ProxyStatus {
        if (!output || output.trim() === '') {
            return { isRunning: false, proxies: [] };
        }

        const lines = output.split('\n');

        // Explicit "Not Running" check — only in header section (before the server table)
        const headerLines = lines.slice(0, 5).join('\n').toLowerCase();
        if (headerLines.includes('not running')) {
            return { isRunning: false, proxies: [] };
        }

        let isRunning = false;
        for (let i = 0; i < Math.min(lines.length, 10); i++) {
            const line = lines[i].toLowerCase();
            if (line.includes('listening') || line.includes('proxy is running')) {
                isRunning = true;
                break;
            }
        }

        const proxies: { domain: string; directory: string }[] = [];
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('+') || trimmed.startsWith('-') ||
                trimmed.startsWith('┌') || trimmed.startsWith('└') || trimmed.startsWith('├') ||
                trimmed.includes('Domain') || trimmed.includes('Directory')) {
                continue;
            }

            const domainMatch = trimmed.match(DOMAIN_REGEX);
            if (domainMatch) {
                const domain = domainMatch[1];
                const pathMatch = trimmed.match(PATH_REGEX);
                const directory = pathMatch ? pathMatch[1] : '';

                if (!proxies.find(p => p.domain === domain)) {
                    proxies.push({ domain, directory });
                }
            }
        }

        return { isRunning, proxies };
    }
}
