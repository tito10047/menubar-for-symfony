import { PhpVersion } from '../core/dto/PhpVersion';
import { PhpInfo } from '../core/dto/PhpInfo';
import { SymfonyServer } from '../core/dto/SymfonyServer';
import { ProxyStatus } from '../core/dto/ProxyStatus';

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
