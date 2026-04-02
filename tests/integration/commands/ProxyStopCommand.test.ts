import { NodeProcessRunner } from '../../helpers/NodeProcessRunner';
import { SymfonyCliDetector } from '../../helpers/SymfonyCliDetector';
import { ProxyStopCommand } from '../../../src/core/commands/ProxyStopCommand';
import { ProxyStatusCommand } from '../../../src/core/commands/ProxyStatusCommand';

describe('ProxyStopCommand Integration', () => {
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

    it('should stop the proxy service', async () => {
        if (!symfonyPath) {
            console.warn('⚠️ Symfony CLI not found. Skipping.');
            return;
        }

        const stopCmd = new ProxyStopCommand(runner);
        const statusCmd = new ProxyStatusCommand(runner);

        const result = await stopCmd.execute();
        expect(result).toBe(true);
        const status = await statusCmd.execute();
        expect(status.isRunning).toBe(false);
    }, 20000);
});
