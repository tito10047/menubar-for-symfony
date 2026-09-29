/**
 * Renders an unknown thrown value as a message suitable for the journal.
 *
 * GJS throws both `Error` instances and bare GLib errors, so `catch` blocks
 * cannot assume either. Nothing is ever swallowed: callers log or rethrow the
 * result of this function.
 */
export function formatError(cause: unknown): string {
    if (cause instanceof Error) {
        return cause.message;
    }
    if (typeof cause === 'string') {
        return cause;
    }
    try {
        return String(cause);
    } catch {
        return '<unrepresentable error>';
    }
}
