import { Extension } from 'gi://gnome-shell/extensions/extension';
import { ConsoleLogger } from './core/logging/ConsoleLogger';
import { GjsProcessRunner } from './core/GjsProcessRunner';
import { SymfonyCliManager } from './core/SymfonyCliManager';
import { VersionResponse } from './core/dto/VersionResponse';

/**
 * Main extension entry point for GNOME Shell 45+
 */
export default class SymfonyMenubarExtension extends Extension {
    private logger?: ConsoleLogger;
    private processRunner?: GjsProcessRunner;
    private cliManager?: SymfonyCliManager;

    /**
     * Called when the extension is enabled.
     */
    enable(): void {
        this.logger = new ConsoleLogger();
        this.processRunner = new GjsProcessRunner(this.logger);
        this.cliManager = new SymfonyCliManager(this.processRunner);
        this.cliManager.setLogger(this.logger);

        this.logger.info('Symfony Menubar Extension Enabled');

        // Diagnostic: Run VersionCommand asynchronously
        this.runDiagnostics();
    }

    /**
     * Called when the extension is disabled.
     */
    disable(): void {
        if (this.logger) {
            this.logger.info('Symfony Menubar Extension Disabled');
        }

        this.cliManager = undefined;
        this.processRunner = undefined;
        this.logger = undefined;
    }

    /**
     * Run version command for diagnostic purposes and log the result.
     */
    private async runDiagnostics(): Promise<void> {
        try {
            if (this.cliManager && this.logger) {
                const response = await this.cliManager.runCommand<VersionResponse>('version');
                this.logger.info(`SUCCESS: ${response.version}`);
            }
        } catch (error) {
            this.logger?.error(`Diagnostic failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
