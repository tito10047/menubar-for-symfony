import { NodeProcessRunner } from '../../helpers/NodeProcessRunner';
import { SymfonyCliDetector } from '../../helpers/SymfonyCliDetector';
import { VersionCommand } from '../../../src/core/commands/VersionCommand';

describe('VersionCommand Integration', () => {
    const isIntegrationEnabled = process.env.RUN_INTEGRATION === '1';

    if (!isIntegrationEnabled) {
        it('skipped integration tests', () => {});
        return;
    }

    let symfonyPath: string | null = null;

    beforeAll(() => {
        symfonyPath = SymfonyCliDetector.detect();
    });

    it('should fetch version from real symfony CLI', async () => {
        if (!symfonyPath) {
            console.warn('⚠️ Symfony CLI was not found. Skipping.');
            return;
        }

        const runner = new NodeProcessRunner(symfonyPath);
        const command = new VersionCommand(runner);

        const result = await command.execute();

        expect(typeof result.version).toBe('string');
        expect(result.version).toMatch(/^\d+\.\d+\.\d+/);
    });
});
