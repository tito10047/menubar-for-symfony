/**
 * Bundles both halves of the project with esbuild.
 *
 * Two entry points, two independent artifacts:
 *
 *   dist/extension/extension.js              -> goes into the ZIP uploaded to EGO
 *   dist/daemon/symfony-menubar-daemon.js    -> installed by daemon/install.sh
 *
 * Bundling rather than emitting a file tree is deliberate. GNOME requires
 * `extension.js` at the root of the extension directory, and a single readable
 * file per artifact is also what the reviewer and the user have to read: nothing
 * is minified, so the output stays reviewable line by line.
 */

import { build, context } from 'esbuild';
import { readFileSync } from 'node:fs';

const metadata = JSON.parse(readFileSync('metadata.json', 'utf8'));
const version = metadata['version-name'];

if (typeof version !== 'string' || version === '') {
    throw new Error('metadata.json is missing a "version-name" string');
}

/** Runtimes provided by GJS itself, which must never be bundled. */
const RUNTIME_MODULES = ['gi://*', 'resource://*', 'system', 'gettext', 'cairo', 'console'];

const common = {
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    target: 'esnext',
    charset: 'utf8',
    minify: false,
    external: RUNTIME_MODULES,
    define: {
        // Keeps metadata.json the single source of truth for the version.
        __DAEMON_VERSION__: JSON.stringify(version),
    },
    logLevel: 'info',
};

const TARGETS = {
    extension: { entryPoints: ['src/extension/extension.ts'], outfile: 'dist/extension/extension.js' },
    daemon: { entryPoints: ['src/daemon/main.ts'], outfile: 'dist/daemon/symfony-menubar-daemon.js' },
};

const flags = process.argv.slice(2);
const watch = flags.includes('--watch');
const requested = flags.filter(flag => !flag.startsWith('--'));

for (const name of requested) {
    if (!(name in TARGETS)) {
        throw new Error(`Unknown build target '${name}'. Known targets: ${Object.keys(TARGETS).join(', ')}`);
    }
}

const targets = (requested.length > 0 ? requested : Object.keys(TARGETS)).map(name => TARGETS[name]);

if (watch) {
    const contexts = await Promise.all(targets.map(target => context({ ...common, ...target })));
    await Promise.all(contexts.map(ctx => ctx.watch()));
    console.log(`Watching for changes (version ${version})...`);
} else {
    await Promise.all(targets.map(target => build({ ...common, ...target })));
    console.log(`Built version ${version}`);
}
