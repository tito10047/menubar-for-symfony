import { SymfonyServer } from '../../shared/dto/SymfonyServer.js';
import { PhpVersion } from '../../shared/dto/PhpVersion.js';
import { PhpInfo } from '../../shared/dto/PhpInfo.js';
import { CustomActionDescriptor } from '../../shared/dto/CustomActionDescriptor.js';

/**
 * Decides whether an update from the daemon is worth touching the menu for.
 *
 * Rebuilding the menu destroys the widgets the user may be pointing at — an open
 * submenu belongs to a `ServerMenuItem` that a rebuild throws away — so a state
 * report that changes nothing visible must not reach the UI at all. The daemon
 * notifies on any change to its own snapshot, which includes fields the menu
 * never renders.
 *
 * Pure functions, no GJS: this is where the unit tests live.
 */

/** Stable order, so a reshuffled `server:list` is not mistaken for a change. */
export function sortServersByDirectory(servers: SymfonyServer[]): SymfonyServer[] {
    return [...servers].sort((a, b) => a.directory.localeCompare(b.directory));
}

/**
 * Whether two server lists would render identically. `domain` is deliberately
 * ignored: the menu shows the name, the port, the running state and the PHP
 * version, and follows `url` when opening a browser.
 */
export function sameMenuRelevantState(a: SymfonyServer[], b: SymfonyServer[]): boolean {
    if (a.length !== b.length) return false;

    return a.every((server, index) => {
        const other = b[index];
        return server.directory === other.directory
            && server.port === other.port
            && server.isRunning === other.isRunning
            && server.url === other.url
            && (server.phpVersion ?? null) === (other.phpVersion ?? null);
    });
}

/**
 * Identifies the arrangement of the server sections: which directories exist and
 * which of them are favorites. An unchanged key means every item can be updated
 * in place instead of being rebuilt.
 */
export function menuStructureKey(
    servers: SymfonyServer[],
    isFavorite: (directory: string) => boolean,
): string {
    return servers
        .map(server => `${isFavorite(server.directory) ? 'f' : 'o'}:${server.directory}`)
        .join('\n');
}

/** Custom actions arrive asynchronously and are usually the same list again. */
export function sameCustomActions(
    a: CustomActionDescriptor[],
    b: CustomActionDescriptor[],
): boolean {
    if (a.length !== b.length) return false;

    return a.every((action, index) => {
        const other = b[index];
        return action.id === other.id
            && action.name === other.name
            && (action.icon ?? '') === (other.icon ?? '')
            && (action.inline ?? false) === (other.inline ?? false);
    });
}

/** Identifies the rendered PHP section, badges included. */
export function phpSectionKey(
    versions: PhpVersion[],
    infoByVersion: Map<string, PhpInfo>,
): string {
    return versions
        .map(version => {
            const info = infoByVersion.get(version.version);
            const badges = info
                ? `${info.phpIniPath}|${info.xdebug}|${info.apcu}|${info.opcache}`
                : '';
            return `${version.version}|${version.isDefault ? 'd' : '-'}|${badges}`;
        })
        .join('\n');
}
