import { NodeProcessRunner } from '../../helpers/NodeProcessRunner';
import { WhichSymfonyCommand } from '../../../src/core/commands/WhichSymfonyCommand';

describe('WhichSymfonyCommand Integration', () => {
    const isIntegrationEnabled = process.env.RUN_INTEGRATION === '1';

    if (!isIntegrationEnabled) {
        it('skipped integration tests', () => {});
        return;
    }

    it('should find symfony binary using real which command', async () => {
        const runner = new NodeProcessRunner(); // default 'symfony' but doesn't matter much here
        const command = new WhichSymfonyCommand(runner);

        const result = await command.execute();

        // result.path should be a non-empty string and a path to symfony
        if (result.path !== null) {
            expect(typeof result.path).toBe('string');
            expect(result.path).toMatch(/\bsymfony\b/);
            expect(result.path).toMatch(/^\//); // Should be absolute path
        } else {
            // It might be possible that symfony is not in PATH during test
            console.warn('⚠️ Symfony binary not found by which during integration test.');
        }
    });
});
