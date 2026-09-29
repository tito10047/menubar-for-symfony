/**
 * Minimal subset of Gio.Settings used by FavoritesRepository.
 * Duck-typed so the class remains testable in Jest (Node.js) without GJS.
 */
export interface GSettingsLike {
    get_strv(key: string): string[];
    set_strv(key: string, value: string[]): void;
    connect(signal: string, callback: () => void): number;
}

export interface FavoritesRepositoryInterface {
    getAll(): string[];
    add(directory: string): void;
    remove(directory: string): void;
    isFavorite(directory: string): boolean;
    onChange(callback: () => void): void;
}

export class FavoritesRepository implements FavoritesRepositoryInterface {
    constructor(private readonly settings: GSettingsLike) {}

    getAll(): string[] {
        return this.settings.get_strv('favorite-servers');
    }

    add(directory: string): void {
        const current = this.getAll();
        if (current.includes(directory)) return;
        this.settings.set_strv('favorite-servers', [...current, directory]);
    }

    remove(directory: string): void {
        this.settings.set_strv(
            'favorite-servers',
            this.getAll().filter(d => d !== directory)
        );
    }

    isFavorite(directory: string): boolean {
        return this.getAll().includes(directory);
    }

    onChange(callback: () => void): void {
        this.settings.connect('changed::favorite-servers', callback);
    }
}
