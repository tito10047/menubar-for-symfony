import { CustomActionDescriptor } from '../../shared/dto/CustomActionDescriptor.js';
import { LoggerInterface } from '../../shared/interfaces/LoggerInterface.js';
import { formatError } from '../../shared/errors.js';

/** A custom action as defined in `actions.json`, including what to execute. */
export interface CustomActionDefinition extends CustomActionDescriptor {
    /** Command line, split into an argv vector before it is executed. */
    command: string;
    /** Working directory; defaults to the server's project directory. */
    path?: string;
}

/**
 * Source of the raw `actions.json` contents. Abstracted so that all parsing and
 * validation below is plain JavaScript and unit-testable without GJS.
 */
export interface ActionsFileSource {
    /** Absolute path of the file, used in log messages. */
    readonly path: string;
    /** Contents of the file, or `null` when it does not exist. Throws when it exists but cannot be read. */
    read(): string | null;
}

/**
 * Reads user-defined actions from `actions.json`.
 *
 * The file is re-read on every call: it is a handful of lines, it is only read
 * when a menu is built, and re-reading means an edit takes effect without
 * restarting anything.
 *
 * A malformed file never propagates as an error — the menu must still open — but
 * every reason for skipping something is logged, so a user whose action does not
 * show up can find out why from the journal.
 */
export class CustomActionsRepository {
    constructor(
        private readonly source: ActionsFileSource,
        private readonly logger: LoggerInterface,
    ) {}

    list(): CustomActionDefinition[] {
        let contents: string | null;
        try {
            contents = this.source.read();
        } catch (cause) {
            this.logger.error(`Cannot read ${this.source.path}: ${formatError(cause)}`);
            return [];
        }

        if (contents === null) {
            this.logger.debug(`No custom actions file at ${this.source.path}`);
            return [];
        }

        let parsed: unknown;
        try {
            parsed = JSON.parse(contents);
        } catch (cause) {
            this.logger.error(`${this.source.path} is not valid JSON: ${formatError(cause)}`);
            return [];
        }

        if (!Array.isArray(parsed)) {
            this.logger.error(`${this.source.path} must contain a JSON array of actions.`);
            return [];
        }

        return this._collect(parsed);
    }

    private _collect(entries: unknown[]): CustomActionDefinition[] {
        const actions: CustomActionDefinition[] = [];
        const seenNames = new Set<string>();

        entries.forEach((entry, index) => {
            const problem = describeProblem(entry);
            if (problem !== null) {
                this.logger.warn(`Skipping action #${index} in ${this.source.path}: ${problem}`);
                return;
            }

            const candidate = entry as RawAction;
            if (seenNames.has(candidate.name)) {
                this.logger.warn(
                    `Skipping action #${index} in ${this.source.path}: duplicate name '${candidate.name}'. ` +
                    'Action names identify the action and must be unique.',
                );
                return;
            }
            seenNames.add(candidate.name);

            actions.push({
                // The name doubles as the id: it is already required to be
                // present, is unique after the check above, and makes the
                // daemon's log lines readable.
                id: candidate.name,
                name: candidate.name,
                command: candidate.command,
                path: candidate.path,
                icon: candidate.icon,
                inline: candidate.inline,
            });
        });

        this.logger.info(`Loaded ${actions.length} custom action(s) from ${this.source.path}`);
        return actions;
    }
}

interface RawAction {
    name: string;
    command: string;
    path?: string;
    icon?: string;
    inline?: boolean;
}

/** Returns why the entry is unusable, or `null` when it is a valid action. */
function describeProblem(entry: unknown): string | null {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
        return 'expected a JSON object';
    }

    const record = entry as Record<string, unknown>;

    for (const field of ['name', 'command'] as const) {
        const value = record[field];
        if (typeof value !== 'string') {
            return `'${field}' is required and must be a string`;
        }
        if (value.trim() === '') {
            return `'${field}' must not be empty`;
        }
    }

    for (const field of ['path', 'icon'] as const) {
        if (record[field] !== undefined && typeof record[field] !== 'string') {
            return `'${field}' must be a string when present`;
        }
    }

    if (record['inline'] !== undefined && typeof record['inline'] !== 'boolean') {
        return `'inline' must be a boolean when present`;
    }

    return null;
}
