import { FavoritesRepository } from '../../../../src/extension/core/services/FavoritesRepository';

interface MockSettings {
    get_strv: jest.Mock;
    set_strv: jest.Mock;
    connect: jest.Mock;
}

function createMockSettings(initial: string[] = []): MockSettings {
    let stored = [...initial];
    return {
        get_strv: jest.fn(() => [...stored]),
        set_strv: jest.fn((_key: string, value: string[]) => { stored = [...value]; }),
        connect: jest.fn(),
    };
}

describe('FavoritesRepository', () => {
    let settings: MockSettings;
    let repo: FavoritesRepository;

    beforeEach(() => {
        settings = createMockSettings();
        repo = new FavoritesRepository(settings as any);
    });

    describe('getAll()', () => {
        it('returns empty array when no favorites stored', () => {
            expect(repo.getAll()).toEqual([]);
        });

        it('returns all stored favorites', () => {
            settings = createMockSettings(['/home/user/project-a', '/home/user/project-b']);
            repo = new FavoritesRepository(settings as any);
            expect(repo.getAll()).toEqual(['/home/user/project-a', '/home/user/project-b']);
        });
    });

    describe('add()', () => {
        it('adds a directory to favorites', () => {
            repo.add('/home/user/my-project');
            expect(settings.set_strv).toHaveBeenCalledWith('favorite-servers', ['/home/user/my-project']);
        });

        it('does not add duplicate directory', () => {
            settings = createMockSettings(['/home/user/my-project']);
            repo = new FavoritesRepository(settings as any);
            repo.add('/home/user/my-project');
            expect(settings.set_strv).not.toHaveBeenCalled();
        });

        it('appends to existing list', () => {
            settings = createMockSettings(['/home/user/existing']);
            repo = new FavoritesRepository(settings as any);
            repo.add('/home/user/new-project');
            expect(settings.set_strv).toHaveBeenCalledWith(
                'favorite-servers',
                ['/home/user/existing', '/home/user/new-project']
            );
        });
    });

    describe('remove()', () => {
        it('removes a directory from favorites', () => {
            settings = createMockSettings(['/home/user/project-a', '/home/user/project-b']);
            repo = new FavoritesRepository(settings as any);
            repo.remove('/home/user/project-a');
            expect(settings.set_strv).toHaveBeenCalledWith('favorite-servers', ['/home/user/project-b']);
        });

        it('does nothing when directory is not in favorites', () => {
            settings = createMockSettings(['/home/user/project-a']);
            repo = new FavoritesRepository(settings as any);
            repo.remove('/home/user/non-existent');
            expect(settings.set_strv).toHaveBeenCalledWith('favorite-servers', ['/home/user/project-a']);
        });

        it('results in empty array when last favorite removed', () => {
            settings = createMockSettings(['/home/user/only-project']);
            repo = new FavoritesRepository(settings as any);
            repo.remove('/home/user/only-project');
            expect(settings.set_strv).toHaveBeenCalledWith('favorite-servers', []);
        });
    });

    describe('isFavorite()', () => {
        it('returns true when directory is in favorites', () => {
            settings = createMockSettings(['/home/user/project-a']);
            repo = new FavoritesRepository(settings as any);
            expect(repo.isFavorite('/home/user/project-a')).toBe(true);
        });

        it('returns false when directory is not in favorites', () => {
            settings = createMockSettings(['/home/user/project-a']);
            repo = new FavoritesRepository(settings as any);
            expect(repo.isFavorite('/home/user/other')).toBe(false);
        });

        it('returns false for empty favorites list', () => {
            expect(repo.isFavorite('/home/user/project')).toBe(false);
        });
    });

    describe('onChange()', () => {
        it('registers a listener for favorite-servers changes', () => {
            const callback = jest.fn();
            repo.onChange(callback);
            expect(settings.connect).toHaveBeenCalledWith('changed::favorite-servers', callback);
        });
    });
});
