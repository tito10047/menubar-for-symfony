import { LoggerInterface } from '../interfaces/LoggerInterface.js';

/**
 * The logging sink `ConsoleLogger` writes to. In the extension this is the
 * logger handed out by `Extension.getLogger()`; in the daemon it is a thin
 * wrapper over `console`, whose output lands in the journal.
 */
export interface GnomeLogger {
    log(message: string): void;
    warn(message: string): void;
    error(message: string): void;
}

export class ConsoleLogger implements LoggerInterface {
    private readonly _gnomeLogger: GnomeLogger;
    private _debugLogging: boolean = false;

    constructor(gnomeLogger: GnomeLogger) {
        this._gnomeLogger = gnomeLogger;
    }

    setDebugLogging(enabled: boolean): void {
        this._debugLogging = enabled;
    }

    debug(message: string, ...args: any[]): void {
        if (!this._debugLogging) return;
        this._gnomeLogger.log(args.length ? `${message} ${args.map(a => JSON.stringify(a)).join(' ')}` : message);
    }

    info(message: string, ...args: any[]): void {
        if (!this._debugLogging) return;
        this._gnomeLogger.log(args.length ? `${message} ${args.map(a => JSON.stringify(a)).join(' ')}` : message);
    }

    warn(message: string, ...args: any[]): void {
        this._gnomeLogger.warn(args.length ? `${message} ${args.map(a => JSON.stringify(a)).join(' ')}` : message);
    }

    error(message: string, ...args: any[]): void {
        this._gnomeLogger.error(args.length ? `${message} ${args.map(a => JSON.stringify(a)).join(' ')}` : message);
    }
}
