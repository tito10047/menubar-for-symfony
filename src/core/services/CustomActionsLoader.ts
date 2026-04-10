import { CustomAction } from '../dto/CustomAction.js';

/**
 * Minimal subset of GLib file operations needed by CustomActionsLoader.
 * Duck-typed so the class remains testable in Jest (Node.js) without GJS.
 */
export interface GLibReadLike {
    file_get_contents(path: string): [boolean, Uint8Array | null];
}

export interface CustomActionsLoaderInterface {
    load(extensionPath: string): CustomAction[];
}

/**
 * Loads custom action definitions from <extensionPath>/actions.json.
 * Returns an empty array if the file does not exist, is invalid JSON,
 * or contains entries that are missing required fields — the extension
 * must never crash due to a bad or missing actions file.
 */
export class CustomActionsLoader implements CustomActionsLoaderInterface {
    constructor(private readonly glib: GLibReadLike) {}

    load(extensionPath: string): CustomAction[] {
        const filePath = `${extensionPath}/actions.json`;
        try {
            const [ok, contents] = this.glib.file_get_contents(filePath);
            if (!ok || !contents) return [];
            const parsed: unknown = JSON.parse(new TextDecoder().decode(contents));
            if (!Array.isArray(parsed)) return [];
            return parsed.filter(isValidAction);
        } catch {
            return [];
        }
    }
}

function isValidAction(item: unknown): item is CustomAction {
    return (
        typeof item === 'object' &&
        item !== null &&
        typeof (item as Record<string, unknown>).name === 'string' &&
        typeof (item as Record<string, unknown>).command === 'string'
    );
}
