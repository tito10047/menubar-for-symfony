import { NodeProcessRunner } from '../../helpers/NodeProcessRunner';
import { SymfonyCliDetector } from '../../helpers/SymfonyCliDetector';
import { ProxyDomainDetachCommand } from '../../../src/core/commands/ProxyDomainDetachCommand';

describe('ProxyDomainDetachCommand Integration', () => {
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

    it('should detach a domain from proxy', async () => {
        if (!symfonyPath) {
            console.warn('⚠️ Symfony CLI not found. Skipping.');
            return;
        }

        const detachCmd = new ProxyDomainDetachCommand(runner);

        // Detaching a non-existent domain should still "succeed" (not throw) or give an error we can handle
        // Note: Symfony CLI expects domain without the .wip suffix for detach command
        const result = await detachCmd.execute(['non-existent-integration-test']);
        expect(result).toBe(true);
    }, 10000);
});
