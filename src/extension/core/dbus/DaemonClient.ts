import { unpackDicts } from '../../../shared/dbus/variant.js';
import {
    CUSTOM_ACTION_SPEC,
    CustomActionWire,
    PHP_VERSION_SPEC,
    PROXY_SPEC,
    PhpVersionWire,
    ProxyWire,
    SERVER_SPEC,
    ServerWire,
    fromCustomActionWire,
    fromPhpVersionWire,
    fromProxyWire,
    fromServerWire,
} from '../../../shared/dbus/wire.js';
import { SymfonyServer } from '../../../shared/dto/SymfonyServer.js';
import { ProxyStatus } from '../../../shared/dto/ProxyStatus.js';
import { CustomActionDescriptor } from '../../../shared/dto/CustomActionDescriptor.js';
import { DaemonClientInterface, InspectedPhpVersion } from './DaemonClientInterface.js';
import { SymfonyMenubarProxy } from './SymfonyMenubarProxy.js';

/**
 * Turns the generated D-Bus proxy into the typed API the rest of the extension
 * uses, unpacking every reply into the DTOs the UI already speaks.
 */
export class DaemonClient implements DaemonClientInterface {
    constructor(private readonly proxy: SymfonyMenubarProxy) {}

    async listServers(): Promise<SymfonyServer[]> {
        const [payload] = await this.proxy.ListServersAsync();
        return DaemonClient.decodeServers(payload);
    }

    async startServer(directory: string): Promise<void> {
        await this.proxy.StartServerAsync(directory);
    }

    async stopServer(directory: string): Promise<void> {
        await this.proxy.StopServerAsync(directory);
    }

    async openServerLog(directory: string): Promise<void> {
        await this.proxy.OpenServerLogAsync(directory);
    }

    async listPhpVersions(): Promise<InspectedPhpVersion[]> {
        const [payload] = await this.proxy.ListPhpVersionsAsync();
        return DaemonClient.decodePhpVersions(payload);
    }

    async getProxyStatus(): Promise<ProxyStatus> {
        const [isRunning, proxies] = await this.proxy.GetProxyStatusAsync();
        return DaemonClient.decodeProxyStatus(isRunning, proxies);
    }

    async startProxy(): Promise<void> {
        await this.proxy.StartProxyAsync();
    }

    async stopProxy(): Promise<void> {
        await this.proxy.StopProxyAsync();
    }

    async getProxyUrl(): Promise<string> {
        const [url] = await this.proxy.GetProxyUrlAsync();
        if (typeof url !== 'string') {
            throw new TypeError(`GetProxyUrl returned ${typeof url} instead of a string`);
        }
        return url;
    }

    async detachProxyDomain(domain: string): Promise<void> {
        await this.proxy.DetachProxyDomainAsync(domain);
    }

    async listCustomActions(): Promise<CustomActionDescriptor[]> {
        const [payload] = await this.proxy.ListCustomActionsAsync();
        return unpackDicts<CustomActionWire>(CUSTOM_ACTION_SPEC, payload, 'ListCustomActions')
            .map(fromCustomActionWire);
    }

    async runCustomAction(id: string, directory: string): Promise<void> {
        await this.proxy.RunCustomActionAsync(id, directory);
    }

    // Decoding is exposed as statics so that the signal handlers in
    // `DaemonConnection` decode signal payloads exactly like method replies.

    static decodeServers(payload: unknown): SymfonyServer[] {
        return unpackDicts<ServerWire>(SERVER_SPEC, payload, 'servers').map(fromServerWire);
    }

    static decodePhpVersions(payload: unknown): InspectedPhpVersion[] {
        return unpackDicts<PhpVersionWire>(PHP_VERSION_SPEC, payload, 'phpVersions')
            .map(fromPhpVersionWire);
    }

    static decodeProxyStatus(isRunning: unknown, proxies: unknown): ProxyStatus {
        if (typeof isRunning !== 'boolean') {
            throw new TypeError(`Proxy status flag is ${typeof isRunning} instead of a boolean`);
        }
        return {
            isRunning,
            proxies: unpackDicts<ProxyWire>(PROXY_SPEC, proxies, 'proxies').map(fromProxyWire),
        };
    }
}
