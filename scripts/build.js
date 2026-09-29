/**
 * Bundles the extension into a single readable file with esbuild.
 *
 *   dist/extension/extension.js
 *
 * Bundling rather than emitting a file tree is deliberate on two counts. GNOME
 * requires `extension.js` at the root of the extension directory, and a single
 * file is what the reviewer at extensions.gnome.org has to read: nothing is
 * minified, so the output stays reviewable line by line.
 *
 * The helper daemon is built from its own repository:
 * https://github.com/tito10047/symfony-menubar-daemon
 */

import { build, context } from 'esbuild';

/** Modules provided by gnome-shell and GJS, which must never be bundled. */
const RUNTIME_MODULES = ['gi://*', 'resource://*'];

const options = {
    entryPoints: ['src/extension/extension.ts'],
    outfile: 'dist/extension/extension.js',
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    target: 'esnext',
    charset: 'utf8',
    minify: false,
    external: RUNTIME_MODULES,
    logLevel: 'info',
};

if (process.argv.includes('--watch')) {
    const ctx = await context(options);
    await ctx.watch();
    console.log('Watching for changes...');
} else {
    await build(options);
    console.log('Built dist/extension/extension.js');
}
