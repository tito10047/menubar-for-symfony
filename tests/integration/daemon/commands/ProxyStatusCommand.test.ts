import { NodeProcessRunner } from '../../../helpers/NodeProcessRunner';
import { SymfonyCliDetector } from '../../../helpers/SymfonyCliDetector';
import { ProxyStatusCommand } from '../../../../src/daemon/core/commands/ProxyStatusCommand';

describe('ProxyStatusCommand Integration', () => {
    const isIntegrationEnabled = process.env.RUN_INTEGRATION === '1';

    if (!isIntegrationEnabled) {
        it('skipped integration tests', () => {});
        return;
    }

    let symfonyPath: string | null = null;

    beforeAll(() => {
        symfonyPath = SymfonyCliDetector.detect();
    });

    it('should fetch Proxy status from real symfony CLI', async () => {
        if (!symfonyPath) return;

        const runner = new NodeProcessRunner(symfonyPath);
        const command = new ProxyStatusCommand(runner);

        const result = await command.execute();

        expect(result).toHaveProperty('isRunning');
        expect(Array.isArray(result.proxies)).toBe(true);
    });
});
