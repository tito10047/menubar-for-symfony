import { NodeProcessRunner } from '../../../helpers/NodeProcessRunner';
import { SymfonyCliDetector } from '../../../helpers/SymfonyCliDetector';
import { ProxyUrlCommand } from '../../../../src/daemon/core/commands/ProxyUrlCommand';
import { ProxyStatusCommand } from '../../../../src/daemon/core/commands/ProxyStatusCommand';

describe('ProxyUrlCommand Integration', () => {
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

    it('should return a URL string when proxy is running', async () => {
        if (!symfonyPath) {
            console.warn('⚠️ Symfony CLI not found. Skipping.');
            return;
        }

        const statusCmd = new ProxyStatusCommand(runner);
        const status = await statusCmd.execute();

        if (!status.isRunning) {
            console.warn('⚠️ Proxy is not running. Skipping URL assertion.');
            return;
        }

        const urlCmd = new ProxyUrlCommand(runner);
        const url = await urlCmd.execute();

        expect(typeof url).toBe('string');
        expect(url.length).toBeGreaterThan(0);
        expect(url).toMatch(/^https?:\/\//);
    }, 10000);
});
