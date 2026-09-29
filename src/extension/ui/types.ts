import { PhpVersion } from '../../shared/dto/PhpVersion.js';
import { PhpInfo } from '../../shared/dto/PhpInfo.js';
import { SymfonyServer } from '../../shared/dto/SymfonyServer.js';
import { ProxyStatus } from '../../shared/dto/ProxyStatus.js';

export interface ExtensionRef {
    openPreferences(): void;
    path: string;
}

export interface MenuData {
    phpVersions: PhpVersion[];
    phpInfoMap: Map<string, PhpInfo>;
    servers: SymfonyServer[];
    proxyStatus: ProxyStatus;
    cliAvailable: boolean;
}
