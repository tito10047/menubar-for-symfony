import { GnomeLogger } from '../../shared/logging/ConsoleLogger.js';

const PREFIX = '[SymfonyMenubar]';

/**
 * Logging sink for the daemon.
 *
 * The daemon is normally started through D-Bus activation, so its stdout and
 * stderr are captured by the journal. The same prefix as the extension is used
 * so that both sides of the bus can be followed with a single `journalctl`
 * filter while debugging.
 */
export class JournalPrinter implements GnomeLogger {
    log(message: string): void {
        console.log(`${PREFIX} ${message}`);
    }

    warn(message: string): void {
        console.warn(`${PREFIX} ${message}`);
    }

    error(message: string): void {
        console.error(`${PREFIX} ${message}`);
    }
}
