import GLib from 'gi://GLib';
import { ActionsFileSource } from './CustomActionsRepository.js';

export const CONFIG_DIRECTORY_NAME = 'symfony-menubar';
export const ACTIONS_FILE_NAME = 'actions.json';

/**
 * Reads `actions.json` from the user's config directory.
 *
 * The file lives in `~/.config/symfony-menubar/` rather than inside the
 * extension directory, which GNOME replaces wholesale on every extension update.
 */
export class GLibActionsFileSource implements ActionsFileSource {
    readonly path: string;

    constructor() {
        this.path = GLib.build_filenamev([
            GLib.get_user_config_dir(),
            CONFIG_DIRECTORY_NAME,
            ACTIONS_FILE_NAME,
        ]);
    }

    read(): string | null {
        if (!GLib.file_test(this.path, GLib.FileTest.EXISTS)) {
            return null;
        }

        const [ok, contents] = GLib.file_get_contents(this.path);
        if (!ok) {
            throw new Error(`GLib reported a failure while reading ${this.path}`);
        }

        return new TextDecoder().decode(contents);
    }
}
