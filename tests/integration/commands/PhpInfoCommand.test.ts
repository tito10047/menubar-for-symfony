import { NodeProcessRunner } from '../../helpers/NodeProcessRunner';
import { PhpInfoCommand } from '../../../src/core/commands/PhpInfoCommand';
import { execSync } from 'child_process';

describe('PhpInfoCommand Integration', () => {
    const isIntegrationEnabled = process.env.RUN_INTEGRATION === '1';

    if (!isIntegrationEnabled) {
        it('skipped integration tests', () => {});
        return;
    }

    let phpPath: string | null = null;

    beforeAll(() => {
        try {
            phpPath = execSync('which php').toString().trim();
        } catch (error) {
            console.warn('⚠️ PHP was not found in PATH. Skipping PhpInfoCommand integration tests.');
        }
    });

    it('should fetch real PHP info', async () => {
        if (!phpPath) {
            console.warn('⚠️ Skipping real PHP test because binary was not found.');
            return;
        }

        const runner = new NodeProcessRunner(); // Default to 'symfony' or whatever is default
        const command = new PhpInfoCommand(runner);

        const result = await command.execute([phpPath]); // Pass real PHP path to test parsing logic

        expect(result).toBeDefined();
        expect(typeof result.phpIniPath).toBe('string');
        expect(result.phpIniPath.length).toBeGreaterThan(0);
        expect(typeof result.hasXdebug).toBe('boolean');
        expect(typeof result.hasApcu).toBe('boolean');
        expect(typeof result.hasOpcache).toBe('boolean');
    });

    it('should fetch real PHP info for specific version (e.g. PHP 8.3) if available', async () => {
        const php83Path = '/opt/remi/php83/root/usr/bin/php';
        let exists = false;
        try {
            execSync(`test -f ${php83Path}`);
            exists = true;
        } catch (e) {}

        if (!exists) {
            console.warn(`⚠️ Skipping specific PHP 8.3 test because binary was not found at ${php83Path}`);
            return;
        }

        const runner = new NodeProcessRunner();
        const command = new PhpInfoCommand(runner);

        const result = await command.execute([php83Path]);

        expect(result).toBeDefined();
        expect(result.phpIniPath).toContain('php83');
        expect(typeof result.hasXdebug).toBe('boolean');
    });
});
