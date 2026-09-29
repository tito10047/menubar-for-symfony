import { NodeProcessRunner } from '../../../helpers/NodeProcessRunner';
import { SymfonyCliDetector } from '../../../helpers/SymfonyCliDetector';
import { PhpListCommand } from '../../../../src/daemon/core/commands/PhpListCommand';

describe('PhpListCommand Integration', () => {
    const isIntegrationEnabled = process.env.RUN_INTEGRATION === '1';

    if (!isIntegrationEnabled) {
        it('skipped integration tests', () => {});
        return;
    }

    let symfonyPath: string | null = null;

    beforeAll(() => {
        symfonyPath = SymfonyCliDetector.detect();
    });

    it('should fetch PHP list from real symfony CLI', async () => {
        if (!symfonyPath) return;

        const runner = new NodeProcessRunner(symfonyPath);
        const command = new PhpListCommand(runner);

        const result = await command.execute();

        expect(Array.isArray(result)).toBe(true);
        if (result.length > 0) {
            expect(result[0]).toHaveProperty('version');
            expect(result[0]).toHaveProperty('path');
            expect(result[0]).toHaveProperty('isDefault');
        }
    });
});
