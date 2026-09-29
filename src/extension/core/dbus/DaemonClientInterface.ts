import { SymfonyServer } from '../../../shared/dto/SymfonyServer.js';
import { PhpVersion } from '../../../shared/dto/PhpVersion.js';
import { PhpInfo } from '../../../shared/dto/PhpInfo.js';
import { ProxyStatus } from '../../../shared/dto/ProxyStatus.js';
import { CustomActionDescriptor } from '../../../shared/dto/CustomActionDescriptor.js';

/** A PHP version together with the inspected state the menu draws badges from. */
export interface InspectedPhpVersion {
    version: PhpVersion;
    info: PhpInfo;
}

/**
 * Everything the extension can ask the helper daemon to do.
 *
 * This is the project's single testability seam on the extension side — it took
 * over that role from `ProcessRunnerInterface`, which moved to the daemon along
 * with the subprocesses it used to start.
 *
 * Every method rejects on failure; no method reports a problem by returning an
 * empty or default value.
 */
export interface DaemonClientInterface {
    listServers(): Promise<SymfonyServer[]>;
    startServer(directory: string): Promise<void>;
    stopServer(directory: string): Promise<void>;
    openServerLog(directory: string): Promise<void>;

    listPhpVersions(): Promise<InspectedPhpVersion[]>;

    getProxyStatus(): Promise<ProxyStatus>;
    startProxy(): Promise<void>;
    stopProxy(): Promise<void>;
    getProxyUrl(): Promise<string>;
    detachProxyDomain(domain: string): Promise<void>;

    listCustomActions(): Promise<CustomActionDescriptor[]>;
    runCustomAction(id: string, directory: string): Promise<void>;
}
