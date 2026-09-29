import { DaemonError } from '../shared/dbus/protocol.js';

/**
 * A failure that carries the D-Bus error name to report to the caller.
 *
 * Anything else that reaches the top of a method handler is reported as
 * `CommandFailed` — but always reported, and always logged first.
 */
export class DaemonFailure extends Error {
    constructor(
        readonly dbusErrorName: string,
        message: string,
    ) {
        super(message);
        this.name = 'DaemonFailure';
    }

    static cliNotFound(detail: string): DaemonFailure {
        return new DaemonFailure(DaemonError.CLI_NOT_FOUND, detail);
    }

    static invalidArgument(detail: string): DaemonFailure {
        return new DaemonFailure(DaemonError.INVALID_ARGUMENT, detail);
    }

    static terminalNotFound(detail: string): DaemonFailure {
        return new DaemonFailure(DaemonError.TERMINAL_NOT_FOUND, detail);
    }

    static unknownAction(detail: string): DaemonFailure {
        return new DaemonFailure(DaemonError.UNKNOWN_ACTION, detail);
    }
}
