import Gio from 'gi://Gio';
import { INTERFACE_XML } from '../../../shared/dbus/protocol.js';
import { VariantDict } from '../../../shared/dbus/variant.js';

/**
 * Shape of the proxy that `Gio.DBusProxy.makeProxyWrapper()` generates from the
 * interface XML.
 *
 * The wrapper builds its methods at runtime, so there is nothing for TypeScript
 * to infer. Declaring the shape by hand here — once, right next to the XML it
 * mirrors — is what lets the rest of the extension stay free of casts.
 *
 * Each `*Async` method resolves with the reply tuple as an array, so a method
 * with a single output argument resolves with a one-element array.
 */
export interface SymfonyMenubarProxy {
    readonly ApiVersion: number;
    readonly CliAvailable: boolean;
    readonly SymfonyVersion: string;

    SubscribeAsync(options: VariantDict): Promise<unknown[]>;
    UnsubscribeAsync(): Promise<unknown[]>;
    UpdateOptionsAsync(options: VariantDict): Promise<unknown[]>;

    ListServersAsync(): Promise<unknown[]>;
    StartServerAsync(directory: string): Promise<unknown[]>;
    StopServerAsync(directory: string): Promise<unknown[]>;
    OpenServerLogAsync(directory: string): Promise<unknown[]>;

    ListPhpVersionsAsync(): Promise<unknown[]>;

    GetProxyStatusAsync(): Promise<unknown[]>;
    StartProxyAsync(): Promise<unknown[]>;
    StopProxyAsync(): Promise<unknown[]>;
    GetProxyUrlAsync(): Promise<unknown[]>;
    DetachProxyDomainAsync(domain: string): Promise<unknown[]>;

    ListCustomActionsAsync(): Promise<unknown[]>;
    RunCustomActionAsync(id: string, directory: string): Promise<unknown[]>;

    /** Subscribes to one of the interface's signals. */
    connectSignal(
        signal: 'ServersChanged' | 'ProxyChanged' | 'PhpVersionsChanged',
        handler: (proxy: SymfonyMenubarProxy, sender: string, args: unknown[]) => void,
    ): number;
    disconnectSignal(id: number): void;

    /** GObject signals of the underlying proxy; only property changes are used. */
    connect(signal: 'g-properties-changed', handler: () => void): number;
    disconnect(id: number): void;
}

type ProxyConstructor = (
    bus: Gio.DBusConnection,
    name: string,
    objectPath: string,
    onReady: (proxy: SymfonyMenubarProxy | null, error: unknown) => void,
    cancellable: Gio.Cancellable | null,
) => SymfonyMenubarProxy;

// The single cast in the extension's D-Bus layer: `makeProxyWrapper()` is
// untyped by nature, and this is the one place that knows what it produces.
export const SymfonyMenubarProxyConstructor =
    Gio.DBusProxy.makeProxyWrapper(INTERFACE_XML) as unknown as ProxyConstructor;
