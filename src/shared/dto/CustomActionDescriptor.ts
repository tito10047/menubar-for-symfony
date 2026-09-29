/**
 * A user-defined action as the menu needs to render it.
 *
 * The shell command behind the action is deliberately not part of this type:
 * the extension only ever learns an opaque id and asks the daemon to run it.
 * That is what keeps command execution out of the gnome-shell process.
 */
export interface CustomActionDescriptor {
    /** Stable identifier, used to ask the daemon to run this action. */
    id: string;
    /** Label shown in the menu. */
    name: string;
    /** Symbolic icon name; the menu falls back to a generic icon when absent. */
    icon?: string;
    /** Whether the action also appears as an icon button in compact server rows. */
    inline?: boolean;
}
