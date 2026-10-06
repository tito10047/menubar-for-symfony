/**
 * Wire shapes for the `a{sv}` payloads of the D-Bus interface.
 *
 * D-Bus has no notion of null, so wire shapes use sentinels (`''`, `0`) instead
 * of optional fields and the adapters in this file translate between them and
 * the richer DTOs used by the UI. Every field is declared once in a `*_SPEC`
 * constant, which both `packDict()` and `unpackDict()` are driven by — a
 * mistyped field name is therefore a compile error on both sides of the bus.
 */

import { SymfonyServer } from '../dto/SymfonyServer.js';
import { PhpVersion } from '../dto/PhpVersion.js';
import { PhpInfo, PhpExtensionStatus } from '../dto/PhpInfo.js';
import { SymfonyProxy } from '../dto/ProxyStatus.js';
import { CustomActionDescriptor } from '../dto/CustomActionDescriptor.js';

/** The subset of D-Bus type signatures used by our payloads. */
export type FieldSignature = 's' | 'b' | 'u';

/** Declares the D-Bus signature of every field of a wire shape. */
export type WireSpec<T> = { readonly [K in keyof Required<T>]: FieldSignature };

// ---------------------------------------------------------------------------
// Options (extension -> daemon)
// ---------------------------------------------------------------------------

export interface OptionsWire {
    pollIntervalSeconds: number;
    debugLogging: boolean;
    /**
     * Terminal command used to show server logs, where `%s` stands for the
     * command to run inside the terminal. Empty means "auto-detect".
     */
    terminalCommand: string;
    /** Explicit path to the `symfony` binary. Empty means "search PATH". */
    symfonyPath: string;
}

export const OPTIONS_SPEC = {
    pollIntervalSeconds: 'u',
    debugLogging: 'b',
    terminalCommand: 's',
    symfonyPath: 's',
} as const satisfies WireSpec<OptionsWire>;

// ---------------------------------------------------------------------------
// Servers
// ---------------------------------------------------------------------------

export interface ServerWire {
    directory: string;
    port: number;
    url: string;
    /** Empty when the server has no proxy domain attached. */
    domain: string;
    isRunning: boolean;
}

export const SERVER_SPEC = {
    directory: 's',
    port: 'u',
    url: 's',
    domain: 's',
    isRunning: 'b',
} as const satisfies WireSpec<ServerWire>;

export function toServerWire(server: SymfonyServer): ServerWire {
    return {
        directory: server.directory,
        port: server.port,
        url: server.url,
        domain: server.domain ?? '',
        isRunning: server.isRunning,
    };
}

export function fromServerWire(wire: ServerWire): SymfonyServer {
    return {
        directory: wire.directory,
        port: wire.port,
        url: wire.url,
        domain: wire.domain === '' ? undefined : wire.domain,
        isRunning: wire.isRunning,
    };
}

// ---------------------------------------------------------------------------
// PHP versions
//
// A PHP version and its inspected state travel together: the daemon needs one
// subprocess per binary to collect the state anyway, so splitting it into a
// second round trip would only add latency.
// ---------------------------------------------------------------------------

export interface PhpVersionWire {
    version: string;
    path: string;
    isDefault: boolean;
    phpIniPath: string;
    xdebug: string;
    apcu: string;
    opcache: string;
}

export const PHP_VERSION_SPEC = {
    version: 's',
    path: 's',
    isDefault: 'b',
    phpIniPath: 's',
    xdebug: 's',
    apcu: 's',
    opcache: 's',
} as const satisfies WireSpec<PhpVersionWire>;

export function toPhpVersionWire(version: PhpVersion, info: PhpInfo): PhpVersionWire {
    return {
        version: version.version,
        path: version.path,
        isDefault: version.isDefault,
        phpIniPath: info.phpIniPath,
        xdebug: info.xdebug,
        apcu: info.apcu,
        opcache: info.opcache,
    };
}

export function fromPhpVersionWire(wire: PhpVersionWire): { version: PhpVersion; info: PhpInfo } {
    return {
        version: {
            version: wire.version,
            path: wire.path,
            isDefault: wire.isDefault,
        },
        info: {
            phpIniPath: wire.phpIniPath,
            xdebug: toExtensionStatus(wire.xdebug),
            apcu: toExtensionStatus(wire.apcu),
            opcache: toExtensionStatus(wire.opcache),
        },
    };
}

const EXTENSION_STATUSES: readonly string[] = Object.values(PhpExtensionStatus);

function toExtensionStatus(raw: string): PhpExtensionStatus {
    if (!EXTENSION_STATUSES.includes(raw)) {
        throw new Error(`Unknown PHP extension status on the wire: '${raw}'`);
    }
    return raw as PhpExtensionStatus;
}

// ---------------------------------------------------------------------------
// Proxy
// ---------------------------------------------------------------------------

export interface ProxyWire {
    domain: string;
    directory: string;
}

export const PROXY_SPEC = {
    domain: 's',
    directory: 's',
} as const satisfies WireSpec<ProxyWire>;

export function toProxyWire(proxy: SymfonyProxy): ProxyWire {
    return { domain: proxy.domain, directory: proxy.directory };
}

export function fromProxyWire(wire: ProxyWire): SymfonyProxy {
    return { domain: wire.domain, directory: wire.directory };
}

// ---------------------------------------------------------------------------
// Custom actions
// ---------------------------------------------------------------------------

export interface CustomActionWire {
    id: string;
    name: string;
    /** Empty when the action has no explicit icon. */
    icon: string;
    inline: boolean;
}

export const CUSTOM_ACTION_SPEC = {
    id: 's',
    name: 's',
    icon: 's',
    inline: 'b',
} as const satisfies WireSpec<CustomActionWire>;

export function toCustomActionWire(action: CustomActionDescriptor): CustomActionWire {
    return {
        id: action.id,
        name: action.name,
        icon: action.icon ?? '',
        inline: action.inline ?? false,
    };
}

export function fromCustomActionWire(wire: CustomActionWire): CustomActionDescriptor {
    return {
        id: wire.id,
        name: wire.name,
        icon: wire.icon === '' ? undefined : wire.icon,
        inline: wire.inline,
    };
}
