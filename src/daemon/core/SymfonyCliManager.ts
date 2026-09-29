import { SymfonyCommandInterface } from './interfaces/SymfonyCommandInterface.js';
import { ProcessRunnerInterface } from './interfaces/ProcessRunnerInterface.js';
import { LoggerInterface } from '../../shared/interfaces/LoggerInterface.js';
import { VersionCommand } from './commands/VersionCommand.js';
import { ServerListCommand } from './commands/ServerListCommand.js';
import { PhpListCommand } from './commands/PhpListCommand.js';
import { ProxyStatusCommand } from './commands/ProxyStatusCommand.js';
import { ServerStartCommand } from './commands/ServerStartCommand.js';
import { ServerStopCommand } from './commands/ServerStopCommand.js';
import { ProxyStartCommand } from './commands/ProxyStartCommand.js';
import { ProxyStopCommand } from './commands/ProxyStopCommand.js';
import { ProxyDomainDetachCommand } from './commands/ProxyDomainDetachCommand.js';
import { PhpInfoCommand } from './commands/PhpInfoCommand.js';
import { ProxyUrlCommand } from './commands/ProxyUrlCommand.js';

export class SymfonyCliManager {
    private commands: Map<string, SymfonyCommandInterface<any>> = new Map();
    private logger?: LoggerInterface;

    constructor(processRunner: ProcessRunnerInterface) {
        this.registerCommand(new VersionCommand(processRunner));
        this.registerCommand(new ServerListCommand(processRunner));
        this.registerCommand(new PhpListCommand(processRunner));
        this.registerCommand(new ProxyStatusCommand(processRunner));
        this.registerCommand(new ServerStartCommand(processRunner));
        this.registerCommand(new ServerStopCommand(processRunner));
        this.registerCommand(new ProxyStartCommand(processRunner));
        this.registerCommand(new ProxyStopCommand(processRunner));
        this.registerCommand(new ProxyDomainDetachCommand(processRunner));
        this.registerCommand(new PhpInfoCommand(processRunner));
        this.registerCommand(new ProxyUrlCommand(processRunner));
    }

    setLogger(logger: LoggerInterface): void {
        this.logger = logger;
        for (const command of this.commands.values()) {
            command.setLogger(logger);
        }
    }

    registerCommand(command: SymfonyCommandInterface<any>): void {
        if (this.logger) {
            command.setLogger(this.logger);
        }
        this.commands.set(command.getName(), command);
    }

    async runCommand<T>(commandName: string, args?: string[]): Promise<T> {
        try {
            const command = this.commands.get(commandName);
            if (!command) {
                this.logger?.error(`Command ${commandName} not found`);
                throw new Error(`Command ${commandName} not found`);
            }

            return await command.execute(args);
        } catch (error) {
            this.logger?.error(`Error running command ${commandName}: ${error}`);
            throw error;
        }
    }
}
