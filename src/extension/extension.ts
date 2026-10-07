import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import { OptionsWire } from '../shared/dbus/wire.js';
import { SymfonyServer } from '../shared/dto/SymfonyServer.js';
import { ProxyStatus } from '../shared/dto/ProxyStatus.js';
import { PhpVersion } from '../shared/dto/PhpVersion.js';
import { PhpInfo } from '../shared/dto/PhpInfo.js';
import { ConsoleLogger } from '../shared/logging/ConsoleLogger.js';
import { formatError } from '../shared/errors.js';

import { Indicator, IndicatorType, ServerUpdateOptions } from './ui/Indicator.js';
import { sameMenuRelevantState, sortServersByDirectory } from './ui/serverMenuState.js';
import { openAboutDialog } from './ui/components/AboutDialog.js';
import { openPhpVersionDialog } from './ui/dialogs/PhpVersionDialog.js';
import { openStatusDialog } from './ui/dialogs/StatusDialog.js';
import { statusDialogContent, statusMessage } from './ui/statusPresentation.js';
import { FavoritesRepository } from './core/services/FavoritesRepository.js';
import { PhpVersionFileService } from './core/services/PhpVersionFileService.js';
import { DaemonAvailability, DaemonConnection } from './core/dbus/DaemonConnection.js';
import { DaemonClientInterface, InspectedPhpVersion } from './core/dbus/DaemonClientInterface.js';

/** Settings keys whose value is forwarded to the helper daemon. */
const DAEMON_OPTION_KEYS = ['polling-interval', 'debug-logging', 'terminal-command', 'symfony-path'] as const;

/**
 * Wires the panel menu to the helper daemon.
 *
 * The extension itself no longer runs anything: it owns no subprocesses and no
 * main loop sources. Everything it knows arrives over D-Bus, either as a reply
 * or as a state signal, which is also why `disable()` has nothing to tear down
 * beyond the indicator, the bus connection and its settings handlers.
 */
export default class MenubarForSymfonyExtension extends Extension {
    private _logger: ConsoleLogger | null = null;
    private _indicator: IndicatorType | null = null;
    private _settings: ReturnType<Extension['getSettings']> | null = null;
    private _settingsSignalIds: number[] = [];
    private _connection: DaemonConnection | null = null;
    private _phpVersionFileService: PhpVersionFileService | null = null;

    private _client: DaemonClientInterface | null = null;
    private _availability: DaemonAvailability = { kind: 'unavailable' };
    private _cliAvailable = false;
    private _symfonyVersion = '';
    private _servers: SymfonyServer[] = [];
    private _phpVersions: PhpVersion[] = [];

    override enable(): void {
        const logger = new ConsoleLogger(this.getLogger());
        this._logger = logger;
        logger.info('Enabling extension');

        const settings = this.getSettings();
        this._settings = settings;
        logger.setDebugLogging(settings.get_boolean('debug-logging'));

        for (const key of DAEMON_OPTION_KEYS) {
            this._settingsSignalIds.push(settings.connect(`changed::${key}`, () => this._onSettingsChanged(key)));
        }

        this._phpVersionFileService = new PhpVersionFileService(GLib, logger);

        // @ts-ignore - GObject._init overload signature mismatch in @girs types
        this._indicator = new Indicator({
            favoritesRepository: new FavoritesRepository(settings),
            onRefresh: () => this._refresh(),
            onStartServer: (directory: string) => this._startServer(directory),
            onStopServer: (directory: string) => this._stopServer(directory),
            onOpenBrowser: (directory: string) => this._openServerInBrowser(directory),
            onViewLogs: (directory: string) => this._viewLogs(directory),
            onSetPhpVersion: (directory: string) => this._setPhpVersion(directory),
            onCustomAction: (actionId: string, directory: string) => this._runCustomAction(actionId, directory),
            onStartProxy: () => this._call('proxy:start', client => client.startProxy()),
            onStopProxy: () => this._call('proxy:stop', client => client.stopProxy()),
            onRestartProxy: () => this._restartProxy(),
            onOpenProxyBrowser: () => this._openProxyInBrowser(),
            onStatusActivated: () => this._explainStatus(),
            onAbout: () => openAboutDialog({
                extensionVersion: String(this.metadata['version-name'] ?? this.metadata['version'] ?? ''),
                symfonyVersion: this._symfonyVersion,
            }),
        });
        // @ts-ignore - IndicatorType extends Button; addToStatusArea accepts Button subclasses at runtime
        Main.panel.addToStatusArea(this.uuid, this._indicator);

        this._connection = new DaemonConnection(logger, () => this._readOptions(), {
            onAvailabilityChanged: availability => this._onAvailabilityChanged(availability),
            onServersChanged: servers => this._applyServers(servers),
            onProxyChanged: status => this._applyProxyStatus(status),
            onPhpVersionsChanged: versions => this._applyPhpVersions(versions),
            onCliAvailabilityChanged: available => this._onCliAvailabilityChanged(available),
        });
        this._connection.start();
    }

    override disable(): void {
        this._logger?.info('Disabling extension');

        this._connection?.stop();
        this._indicator?.destroy();

        for (const id of this._settingsSignalIds) {
            this._settings?.disconnect(id);
        }
        this._settingsSignalIds = [];

        this._connection = null;
        this._indicator = null;
        this._settings = null;
        this._phpVersionFileService = null;
        this._client = null;
        this._logger = null;
        this._availability = { kind: 'unavailable' };
        this._cliAvailable = false;
        this._symfonyVersion = '';
        this._servers = [];
        this._phpVersions = [];
    }

    // ---- Daemon lifecycle ------------------------------------------------

    private _onAvailabilityChanged(availability: DaemonAvailability): void {
        this._availability = availability;

        if (availability.kind === 'available') {
            this._client = availability.client;
            this._cliAvailable = availability.cliAvailable;
            this._symfonyVersion = availability.symfonyVersion;
            this._updateStatusMessage();
            this._refresh();
            return;
        }

        this._client = null;
        this._updateStatusMessage();
    }

    private _onCliAvailabilityChanged(available: boolean): void {
        if (available !== this._cliAvailable) {
            this._logger?.info(`Symfony CLI availability changed to ${available}`);
            this._cliAvailable = available;
            this._updateStatusMessage();
        }
    }

    private _updateStatusMessage(): void {
        this._indicator?.updateStatusMessage(this._statusMessage());
    }

    private _statusMessage(): string | null {
        return statusMessage(this._availability, this._cliAvailable);
    }

    /**
     * Opens the dialog behind the status line: what is missing, how to install it
     * and a link to where it lives. Looking for the helper again is the job of the
     * refresh icon in the menu, which already does exactly that.
     */
    private _explainStatus(): void {
        const content = statusDialogContent(this._availability, this._cliAvailable);
        if (content === null) {
            return;
        }
        openStatusDialog(content);
    }

    // ---- Settings --------------------------------------------------------

    private _onSettingsChanged(key: string): void {
        if (key === 'debug-logging' && this._settings !== null) {
            this._logger?.setDebugLogging(this._settings.get_boolean('debug-logging'));
        }
        this._connection?.updateOptions();
    }

    private _readOptions(): OptionsWire {
        const settings = this._settings;
        if (settings === null) {
            throw new Error('Cannot read settings while the extension is disabled');
        }

        return {
            pollIntervalSeconds: settings.get_int('polling-interval'),
            debugLogging: settings.get_boolean('debug-logging'),
            terminalCommand: settings.get_string('terminal-command'),
            symfonyPath: settings.get_string('symfony-path'),
        };
    }

    // ---- Menu actions ----------------------------------------------------

    private _refresh(): void {
        const client = this._client;
        if (client === null) {
            // Nothing to refresh yet; the user most likely just installed the
            // helper, so look for it again.
            this._connection?.retry();
            return;
        }

        // Driven by a click — the refresh button, the status item or a favorite
        // toggle — so it must show up even with the menu open.
        this._track('server:list', client.listServers()
            .then(servers => this._applyServers(servers, { immediate: true })));
        this._track('proxy:status', client.getProxyStatus().then(status => this._applyProxyStatus(status)));
        this._track('php:list', client.listPhpVersions().then(versions => this._applyPhpVersions(versions)));
        this._track('actions:list', client.listCustomActions().then(actions => {
            this._indicator?.updateCustomActions(actions);
        }));
    }

    private _startServer(directory: string): void {
        // Reflect the click immediately; the daemon's next ServersChanged signal
        // is the authority and corrects this within about a second.
        this._indicator?.updateServerItem(directory, { isRunning: true, port: '' });
        this._call('server:start', client => client.startServer(directory));
    }

    private _stopServer(directory: string): void {
        this._indicator?.updateServerItem(directory, { isRunning: false, port: '' });
        this._call('server:stop', client => client.stopServer(directory));
    }

    private _viewLogs(directory: string): void {
        this._call('server:log', client => client.openServerLog(directory));
    }

    private _runCustomAction(actionId: string, directory: string): void {
        this._call(`action '${actionId}'`, client => client.runCustomAction(actionId, directory));
    }

    private _restartProxy(): void {
        this._call('proxy:restart', client => client.stopProxy().then(() => client.startProxy()));
    }

    private _openServerInBrowser(directory: string): void {
        const server = this._servers.find(candidate => candidate.directory === directory);
        if (server === undefined || server.url === '') {
            this._logger?.warn(`Cannot open a browser for ${directory}: no URL is known`);
            return;
        }
        Gio.AppInfo.launch_default_for_uri(server.url, null);
    }

    private _openProxyInBrowser(): void {
        this._call('proxy:url', client => client.getProxyUrl().then(url => {
            if (url === '') {
                this._logger?.warn('The proxy did not report a URL');
                return;
            }
            Gio.AppInfo.launch_default_for_uri(url, null);
        }));
    }

    private _setPhpVersion(directory: string): void {
        const fileService = this._phpVersionFileService;
        if (fileService === null) {
            return;
        }

        openPhpVersionDialog({
            serverName: directory.split('/').pop() ?? directory,
            currentVersion: fileService.read(directory),
            availableVersions: this._phpVersions,
            onSelect: version => {
                // Only claim the change in the menu if it actually reached disk;
                // the service has already logged the reason if it did not.
                if (fileService.write(directory, version)) {
                    this._indicator?.updateServerPhpVersion(directory, version);
                }
            },
        });
    }

    // ---- Applying state --------------------------------------------------

    /**
     * The daemon reports its whole snapshot, which includes fields the menu never
     * shows — the domain of a project with several of them even arrives in a
     * different order on every poll. Rebuilding the menu for that would close
     * whatever submenu the user has open, so a report that changes nothing
     * visible stops here.
     */
    private _applyServers(servers: SymfonyServer[], options: ServerUpdateOptions = {}): void {
        const next = sortServersByDirectory(servers);
        for (const server of next) {
            server.phpVersion = this._phpVersionFileService?.read(server.directory) ?? undefined;
        }

        // A refresh the user asked for always reaches the indicator: toggling a
        // favorite moves an item between the sections without changing any server.
        if (options.immediate !== true && sameMenuRelevantState(this._servers, next)) {
            return;
        }

        this._servers = next;
        this._indicator?.updateServerStatus(next, options);
    }

    private _applyProxyStatus(status: ProxyStatus): void {
        this._indicator?.updateProxyStatus(status);
    }

    private _applyPhpVersions(inspected: InspectedPhpVersion[]): void {
        this._phpVersions = inspected.map(entry => entry.version);

        const infoByVersion = new Map<string, PhpInfo>(
            inspected.map(entry => [entry.version.version, entry.info]),
        );
        this._indicator?.updatePhpStatus(this._phpVersions, infoByVersion);
    }

    // ---- Failure reporting -----------------------------------------------

    /**
     * Runs a call against the daemon, or explains why it could not be made.
     * Used by menu handlers, which cannot await anything themselves.
     */
    private _call(label: string, call: (client: DaemonClientInterface) => Promise<unknown>): void {
        const client = this._client;
        if (client === null) {
            this._logger?.warn(`Cannot run ${label}: the helper app is not available`);
            return;
        }
        this._track(label, call(client));
    }

    /** Makes sure no rejected promise ever goes unreported. */
    private _track(label: string, promise: Promise<unknown>): void {
        const logger = this._logger;
        promise.catch((cause: unknown) => logger?.error(`${label} failed: ${formatError(cause)}`));
    }
}
