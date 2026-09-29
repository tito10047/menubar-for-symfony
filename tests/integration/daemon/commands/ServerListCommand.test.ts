import { NodeProcessRunner } from '../../../helpers/NodeProcessRunner';
import { SymfonyCliDetector } from '../../../helpers/SymfonyCliDetector';
import { ServerListCommand } from '../../../../src/daemon/core/commands/ServerListCommand';

/**
 * Integration test for ServerListCommand.
 * This test calls the actual 'symfony' CLI binary.
 */
describe('ServerListCommand Integration', () => {
    const isIntegrationEnabled = process.env.RUN_INTEGRATION === '1';

    // Guard: Only run if RUN_INTEGRATION=1
    if (!isIntegrationEnabled) {
        it('skipped integration tests (RUN_INTEGRATION is not 1)', () => {
            // Empty test to avoid Jest error about empty suite
        });
        return;
    }

    let symfonyPath: string | null = null;

    beforeAll(() => {
        symfonyPath = SymfonyCliDetector.detect();
    });

    it('should fetch server list from real symfony CLI', async () => {
        if (!symfonyPath) {
            // Fail or skip with a clear message
            console.warn('⚠️ Symfony CLI was not found in the system. Skipping integration test.');
            return;
        }

        const runner = new NodeProcessRunner(symfonyPath);
        const command = new ServerListCommand(runner);

        const result = await command.execute();

        // We expect a valid array, even if empty
        expect(Array.isArray(result)).toBe(true);

        if (result.length > 0) {
            result.forEach(server => {
                expect(server).toHaveProperty('directory');
                expect(server).toHaveProperty('port');
                expect(server).toHaveProperty('url');
                expect(server).toHaveProperty('isRunning');
                expect(typeof server.isRunning).toBe('boolean');
                
                if (server.isRunning) {
                    expect(server.port).toBeGreaterThan(0);
                    // PID is not always available in text output, so we don't strictly require it here
                }
            });
        }
    });
});
