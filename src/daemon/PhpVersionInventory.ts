import { SymfonyCliManager } from './core/SymfonyCliManager.js';
import { PhpVersion } from '../shared/dto/PhpVersion.js';
import { PhpInfo, PhpExtensionStatus } from '../shared/dto/PhpInfo.js';
import { PhpVersionWire, toPhpVersionWire } from '../shared/dbus/wire.js';
import { LoggerInterface } from '../shared/interfaces/LoggerInterface.js';
import { formatError } from '../shared/errors.js';

/** Reported for a PHP build that could not be inspected, so the version itself is still listed. */
const UNINSPECTED: PhpInfo = {
    phpIniPath: '',
    xdebug: PhpExtensionStatus.NOT_INSTALLED,
    apcu: PhpExtensionStatus.NOT_INSTALLED,
    opcache: PhpExtensionStatus.NOT_INSTALLED,
};

/**
 * Lists the PHP versions known to the Symfony CLI together with the state of the
 * extensions the menu shows badges for.
 *
 * The two belong together on the wire: inspecting a build costs two subprocesses
 * either way, so returning them separately would only add a round trip.
 */
export class PhpVersionInventory {
    constructor(
        private readonly manager: SymfonyCliManager,
        private readonly logger: LoggerInterface,
    ) {}

    async list(): Promise<PhpVersionWire[]> {
        const versions = await this.manager.runCommand<PhpVersion[]>('local:php:list');

        const inventory: PhpVersionWire[] = [];
        for (const version of versions) {
            // Sequential on purpose: a machine with several PHP builds would
            // otherwise spawn two processes per build all at once.
            inventory.push(toPhpVersionWire(version, await this._inspect(version)));
        }
        return inventory;
    }

    private async _inspect(version: PhpVersion): Promise<PhpInfo> {
        try {
            return await this.manager.runCommand<PhpInfo>('php:info', [version.path]);
        } catch (cause) {
            // A single broken build must not hide the other versions from the menu.
            this.logger.warn(
                `Could not inspect PHP ${version.version} at ${version.path}: ${formatError(cause)}`,
            );
            return UNINSPECTED;
        }
    }
}
