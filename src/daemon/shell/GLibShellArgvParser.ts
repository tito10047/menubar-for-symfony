import GLib from 'gi://GLib';
import { ShellArgvParser } from './argv.js';

/**
 * Splits command lines with GLib, which applies POSIX shell quoting rules
 * without invoking a shell.
 */
export const glibShellArgvParser: ShellArgvParser = (command: string): string[] => {
    const [ok, argv] = GLib.shell_parse_argv(command);
    if (!ok || argv === null) {
        throw new Error('GLib could not parse the command line');
    }
    return argv;
};
