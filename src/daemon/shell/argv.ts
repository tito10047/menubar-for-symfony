import { DaemonFailure } from '../DaemonFailure.js';

/** Replaced by the server's project directory in custom action commands. */
export const PATH_PLACEHOLDER = '{path}';

/** Replaced by the command to run in the configured terminal command. */
export const COMMAND_PLACEHOLDER = '%s';

/**
 * Splits a command line into an argv vector the way a POSIX shell would, without
 * running one. Implemented by `GLib.shell_parse_argv`; injected so that the logic
 * in this file can be tested outside GJS.
 *
 * @throws When the command line cannot be split.
 */
export type ShellArgvParser = (command: string) => string[];

/**
 * Builds the argv vector for a custom action.
 *
 * The command is split into arguments *first* and `{path}` is substituted into
 * the resulting elements *afterwards*. That order is the entire security
 * property: a project directory containing spaces, quotes, `;` or `$(...)` ends
 * up inside a single argv element, where it cannot grow the vector and never
 * reaches a shell. The previous implementation interpolated the path into a
 * `bash -c` string, which made every directory name a command injection.
 */
export function buildActionArgv(parse: ShellArgvParser, command: string, directory: string): string[] {
    const argv = parseOrFail(parse, command, `action command '${command}'`);
    return argv.map(argument => argument.replaceAll(PATH_PLACEHOLDER, directory));
}

/**
 * Builds the argv vector that runs `command` inside the configured terminal.
 *
 * The `%s` element is replaced by the command's arguments. Substituting whole
 * argv elements rather than text keeps arguments with spaces intact. A configured
 * terminal without `%s` gets the command appended.
 */
export function buildTerminalArgv(
    parse: ShellArgvParser,
    configuredTerminal: string,
    command: readonly string[],
): string[] {
    const prefix = parseOrFail(parse, configuredTerminal, `terminal command '${configuredTerminal}'`);

    const placeholderIndex = prefix.indexOf(COMMAND_PLACEHOLDER);
    if (placeholderIndex === -1) {
        return [...prefix, ...command];
    }

    return [...prefix.slice(0, placeholderIndex), ...command, ...prefix.slice(placeholderIndex + 1)];
}

/** Expands a leading `~/` and substitutes `{path}` in a working directory. */
export function resolveWorkingDirectory(
    configured: string | undefined,
    serverDirectory: string,
    homeDirectory: string,
): string {
    const raw = (configured ?? serverDirectory).replaceAll(PATH_PLACEHOLDER, serverDirectory);
    return raw.startsWith('~/') ? `${homeDirectory}${raw.slice(1)}` : raw;
}

function parseOrFail(parse: ShellArgvParser, command: string, description: string): string[] {
    let argv: string[];
    try {
        argv = parse(command);
    } catch (cause) {
        const reason = cause instanceof Error ? cause.message : String(cause);
        throw DaemonFailure.invalidArgument(`Cannot split ${description} into arguments: ${reason}`);
    }

    if (argv.length === 0) {
        throw DaemonFailure.invalidArgument(`The ${description} does not contain any arguments`);
    }

    return argv;
}
