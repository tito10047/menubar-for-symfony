import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { NodeProcessRunner } from '../../helpers/NodeProcessRunner';
import { SymfonyCliDetector } from '../../helpers/SymfonyCliDetector';
import { ServerStartCommand } from '../../../src/core/commands/ServerStartCommand';
import { ServerStopCommand } from '../../../src/core/commands/ServerStopCommand';
import { ServerListCommand } from '../../../src/core/commands/ServerListCommand';

describe('ServerStopCommand Integration', () => {
    const isIntegrationEnabled = process.env.RUN_INTEGRATION === '1';

    if (!isIntegrationEnabled) {
        it('skipped integration tests', () => {});
        return;
    }

    let symfonyPath: string | null = null;
    let runner: NodeProcessRunner;
    let tempDir: string;

    beforeAll(async () => {
        symfonyPath = SymfonyCliDetector.detect();
        if (symfonyPath) {
            runner = new NodeProcessRunner(symfonyPath);
        }
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'symfony-stop-test-'));
        fs.writeFileSync(path.join(tempDir, 'index.php'), '<?php echo "Hello Stop";');

        if (symfonyPath) {
            const startCmd = new ServerStartCommand(runner);
            await startCmd.execute(['-d', '--dir', tempDir]);
            // Wait for it to start
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }, 20000);

    afterAll(async () => {
        if (tempDir && fs.existsSync(tempDir)) {
            try {
                fs.rmSync(tempDir, { recursive: true, force: true });
            } catch (e) {
                // ignore
            }
        }
    });

    it('should stop a running server', async () => {
        if (!symfonyPath) {
            console.warn('⚠️ Symfony CLI not found. Skipping.');
            return;
        }

        const stopCmd = new ServerStopCommand(runner);
        const listCmd = new ServerListCommand(runner);

        // Stop server
        const result = await stopCmd.execute(['--dir', tempDir]);
        expect(result).toBe(true);

        // Wait for it to stop
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check if stopped
        const servers = await listCmd.execute();
        const realTempDir = fs.realpathSync(tempDir);
        const myServer = servers.find(s => {
            try {
                const realServerDir = s.directory.startsWith('~') ? s.directory : fs.realpathSync(s.directory);
                return realServerDir === realTempDir;
            } catch(e) {
                return s.directory === tempDir;
            }
        });

        if (myServer) {
            expect(myServer.isRunning).toBe(false);
        } else {
            expect(myServer).toBeUndefined();
        }
    }, 40000);
});
