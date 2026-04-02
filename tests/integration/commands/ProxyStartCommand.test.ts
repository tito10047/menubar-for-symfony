import { NodeProcessRunner } from '../../helpers/NodeProcessRunner';
import { SymfonyCliDetector } from '../../helpers/SymfonyCliDetector';
import { ProxyStartCommand } from '../../../src/core/commands/ProxyStartCommand';
import { ProxyStatusCommand } from '../../../src/core/commands/ProxyStatusCommand';

describe('ProxyStartCommand Integration', () => {
    const isIntegrationEnabled = process.env.RUN_INTEGRATION === '1';

    if (!isIntegrationEnabled) {
        it('skipped integration tests', () => {});
        return;
    }

    let symfonyPath: string | null = null;
    let runner: NodeProcessRunner;

    beforeAll(() => {
        symfonyPath = SymfonyCliDetector.detect();
        if (symfonyPath) {
            runner = new NodeProcessRunner(symfonyPath);
        }
    });

    it('should start the proxy service', async () => {
        if (!symfonyPath) {
            console.warn('⚠️ Symfony CLI not found. Skipping.');
            return;
        }

        const startCmd = new ProxyStartCommand(runner);
        const statusCmd = new ProxyStatusCommand(runner);

        const result = await startCmd.execute();
        
        expect(result).toBe(true);

        const status = await statusCmd.execute();
        // Note: If proxy is already running, it stays running.
        // If it fails due to sudo, we catch it.
        expect(status.isRunning).toBe(true);
    }, 20000);
});
