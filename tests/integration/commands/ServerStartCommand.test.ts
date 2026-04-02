import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { NodeProcessRunner } from '../../helpers/NodeProcessRunner';
import { SymfonyCliDetector } from '../../helpers/SymfonyCliDetector';
import { ServerStartCommand } from '../../../src/core/commands/ServerStartCommand';
import { ServerStopCommand } from '../../../src/core/commands/ServerStopCommand';
import { ServerListCommand } from '../../../src/core/commands/ServerListCommand';

describe('ServerStartCommand Integration', () => {
    const isIntegrationEnabled = process.env.RUN_INTEGRATION === '1';

    if (!isIntegrationEnabled) {
        it('skipped integration tests', () => {});
        return;
    }

    let symfonyPath: string | null = null;
    let runner: NodeProcessRunner;
    let tempDir: string;

    beforeAll(() => {
        symfonyPath = SymfonyCliDetector.detect();
        if (symfonyPath) {
            runner = new NodeProcessRunner(symfonyPath);
        }
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'symfony-start-test-'));
        fs.writeFileSync(path.join(tempDir, 'index.php'), '<?php echo "Hello Start";');
    });

    afterAll(async () => {
        if (tempDir && fs.existsSync(tempDir)) {
            if (symfonyPath) {
                const stopCmd = new ServerStopCommand(runner);
                try {
                    await stopCmd.execute(['--dir', tempDir]);
                } catch (e) {
                    // ignore
                }
            }
            try {
                fs.rmSync(tempDir, { recursive: true, force: true });
            } catch (e) {
                // ignore
            }
        }
    });

    it('should start a server in a directory', async () => {
        if (!symfonyPath) {
            console.warn('⚠️ Symfony CLI not found. Skipping.');
            return;
        }

        const startCmd = new ServerStartCommand(runner);
        const listCmd = new ServerListCommand(runner);

        // Start server
        const result = await startCmd.execute(['-d', '--dir', tempDir]);
        expect(result).toBe(true);

        // Wait for it to register
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Check if running
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

        expect(myServer).toBeDefined();
        expect(myServer?.isRunning).toBe(true);
    }, 40000);
});
