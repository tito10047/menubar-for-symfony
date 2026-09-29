import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import { exit, programArgs, programPath } from 'system';

import { BUS_NAME, INTERFACE_XML, OBJECT_PATH } from '../shared/dbus/protocol.js';
import { ConsoleLogger } from '../shared/logging/ConsoleLogger.js';
import { formatError } from '../shared/errors.js';

import { JournalPrinter } from './logging/JournalPrinter.js';
import { GjsProcessRunner } from './core/GjsProcessRunner.js';
import { SymfonyCliManager } from './core/SymfonyCliManager.js';
import { SymfonyEnvironment } from './SymfonyEnvironment.js';
import { PhpVersionInventory } from './PhpVersionInventory.js';
import { CustomActionsRepository } from './services/CustomActionsRepository.js';
import { GLibActionsFileSource } from './services/GLibActionsFileSource.js';
import { ActionRunner } from './ActionRunner.js';
import { glibShellArgvParser } from './shell/GLibShellArgvParser.js';
import { TerminalLauncher } from './TerminalLauncher.js';
import { DaemonService } from './DaemonService.js';

/** Injected at build time from `version-name` in metadata.json. */
declare const __DAEMON_VERSION__: string;

const SERVICE_FILE_NAME = `${BUS_NAME}.service`;

const USAGE = `Usage: symfony-menubar-daemon [OPTION...]

Helper service for the "Menubar for Symfony" GNOME Shell extension. It runs the
Symfony CLI on the extension's behalf and exposes the results on the session bus
as ${BUS_NAME}.

The service is normally started automatically through D-Bus activation and exits
once it has been idle. Running it by hand is only useful for debugging.

Options:
  --install-service     Register the service for D-Bus activation, then exit
  --uninstall-service   Remove that registration, then exit
  --replace             Take the bus name over from an already running instance
  --verbose             Log debug messages until a client configures logging
  --version             Print the version, then exit
  --help                Print this message, then exit
`;

interface Arguments {
    installService: boolean;
    uninstallService: boolean;
    replace: boolean;
    verbose: boolean;
    showVersion: boolean;
    showHelp: boolean;
}

function parseArguments(argv: readonly string[]): Arguments {
    const parsed: Arguments = {
        installService: false,
        uninstallService: false,
        replace: false,
        verbose: false,
        showVersion: false,
        showHelp: false,
    };

    for (const argument of argv) {
        switch (argument) {
            case '--install-service':   parsed.installService = true;   break;
            case '--uninstall-service': parsed.uninstallService = true; break;
            case '--replace':           parsed.replace = true;          break;
            case '--verbose':           parsed.verbose = true;          break;
            case '--version':           parsed.showVersion = true;      break;
            case '--help':
            case '-h':                  parsed.showHelp = true;         break;
            default:
                printerr(`Unknown argument: ${argument}`);
                printerr(USAGE);
                exit(2);
        }
    }

    return parsed;
}

function serviceFilePath(): string {
    return GLib.build_filenamev([GLib.get_user_data_dir(), 'dbus-1', 'services', SERVICE_FILE_NAME]);
}

/**
 * Writes the D-Bus activation file so that the extension never has to start this
 * process itself — the bus does it on the first method call.
 */
function installServiceFile(): number {
    const script = programPath;
    if (script === null) {
        printerr('Cannot install the service file: the daemon path is unknown.');
        return 1;
    }

    const gjs = GLib.find_program_in_path('gjs');
    if (gjs === null) {
        printerr('Cannot install the service file: gjs was not found on PATH.');
        return 1;
    }

    const path = serviceFilePath();
    const contents =
        '[D-BUS Service]\n' +
        `Name=${BUS_NAME}\n` +
        `Exec=${gjs} -m ${script}\n`;

    const directory = GLib.path_get_dirname(path);
    if (GLib.mkdir_with_parents(directory, 0o755) !== 0) {
        printerr(`Cannot create ${directory}`);
        return 1;
    }

    try {
        GLib.file_set_contents(path, contents);
    } catch (cause) {
        printerr(`Cannot write ${path}: ${formatError(cause)}`);
        return 1;
    }

    print(`Registered ${BUS_NAME} for D-Bus activation:`);
    print(`  ${path}`);
    return 0;
}

function uninstallServiceFile(): number {
    const path = serviceFilePath();

    if (!GLib.file_test(path, GLib.FileTest.EXISTS)) {
        print(`Nothing to remove: ${path} does not exist.`);
        return 0;
    }

    try {
        Gio.File.new_for_path(path).delete(null);
    } catch (cause) {
        printerr(`Cannot remove ${path}: ${formatError(cause)}`);
        return 1;
    }

    print(`Removed ${path}`);
    return 0;
}

function runDaemon(args: Arguments): number {
    const logger = new ConsoleLogger(new JournalPrinter());
    logger.setDebugLogging(args.verbose);
    logger.info(`Starting symfony-menubar-daemon ${__DAEMON_VERSION__}`);

    const environment = new SymfonyEnvironment(logger);
    environment.locate('');

    const runner = new GjsProcessRunner(logger, () => environment.requireBinaryPath());
    const manager = new SymfonyCliManager(runner);
    manager.setLogger(logger);

    const loop = new GLib.MainLoop(null, false);
    const service = new DaemonService({
        manager,
        environment,
        phpVersions: new PhpVersionInventory(manager, logger),
        actions: new CustomActionsRepository(new GLibActionsFileSource(), logger),
        actionRunner: new ActionRunner(logger, glibShellArgvParser),
        terminal: new TerminalLauncher(logger, glibShellArgvParser),
        logger,
        onIdle: () => loop.quit(),
    });

    let ownerFlags = Gio.BusNameOwnerFlags.ALLOW_REPLACEMENT;
    if (args.replace) {
        ownerFlags |= Gio.BusNameOwnerFlags.REPLACE;
    }

    const ownerId = Gio.bus_own_name(
        Gio.BusType.SESSION,
        BUS_NAME,
        ownerFlags,
        (connection) => {
            const exported = Gio.DBusExportedObject.wrapJSObject(INTERFACE_XML, service);
            exported.export(connection, OBJECT_PATH);
            service.attach(connection, exported);
            logger.info(`Exported ${OBJECT_PATH}`);
        },
        () => logger.info(`Acquired ${BUS_NAME}`),
        () => {
            // Either another instance replaced us, or the name could not be
            // acquired at all. Both mean this process has no reason to continue.
            logger.warn(`Lost ${BUS_NAME}, shutting down`);
            loop.quit();
        },
    );

    loop.run();

    service.shutdown();
    Gio.bus_unown_name(ownerId);
    logger.info('symfony-menubar-daemon stopped');
    return 0;
}

function main(argv: readonly string[]): number {
    const args = parseArguments(argv);

    if (args.showHelp) {
        print(USAGE);
        return 0;
    }
    if (args.showVersion) {
        print(__DAEMON_VERSION__);
        return 0;
    }
    if (args.installService) {
        return installServiceFile();
    }
    if (args.uninstallService) {
        return uninstallServiceFile();
    }

    return runDaemon(args);
}

exit(main(programArgs));
