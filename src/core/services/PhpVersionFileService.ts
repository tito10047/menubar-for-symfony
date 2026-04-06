/**
 * Minimal subset of GLib file operations used by PhpVersionFileService.
 * Duck-typed so the class remains testable in Jest (Node.js) without GJS.
 */
export interface GLibFileLike {
    file_get_contents(path: string): [boolean, Uint8Array | null];
    file_set_contents(path: string, contents: string): boolean;
    get_home_dir(): string;
}

export interface PhpVersionFileServiceInterface {
    read(directory: string): string | null;
    write(directory: string, version: string): void;
}

/**
 * Reads and writes `.php-version` files in project directories.
 * The file contains a single PHP version string (e.g. "8.3"), read by Symfony CLI on server start.
 */
export class PhpVersionFileService implements PhpVersionFileServiceInterface {
    constructor(private readonly glib: GLibFileLike) {}

    private _expandPath(path: string): string {
        if (path.startsWith('~/')) {
            return this.glib.get_home_dir() + path.slice(1);
        }
        return path;
    }

    /**
     * Reads the PHP version from `directory/.php-version`.
     * Returns the trimmed version string, or null if the file does not exist.
     */
    read(directory: string): string | null {
        const path = `${this._expandPath(directory)}/.php-version`;
        try {
            const [ok, contents] = this.glib.file_get_contents(path);
            if (!ok || !contents) return null;
            return new TextDecoder().decode(contents).trim() || null;
        } catch {
            return null;
        }
    }

    /**
     * Writes the PHP version to `directory/.php-version`.
     * Creates the file if it does not exist, overwrites it otherwise.
     */
    write(directory: string, version: string): void {
        const path = `${this._expandPath(directory)}/.php-version`;
        this.glib.file_set_contents(path, `${version}\n`);
    }
}
