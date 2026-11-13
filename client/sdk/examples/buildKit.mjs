/**
 * `yarn build:kit <kit> [outDir]`: build the example kit in the folder <kit>
 * as a deployed extension, with the settings of `vite.deploy.config.ts`.
 * Without an output folder the bundle goes to
 * `examples/<kit>/dist/deploy/<id>/index.js`.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const [kit, outDir] = process.argv.slice(2);
if (!kit) {
  process.stderr.write('Usage: yarn build:kit <kit folder> [output folder]\n');
  process.exit(2);
}

// The configuration reads the kit from the environment, since Vite takes no
// arguments of its own for a configuration file.
process.env.DTAAS_KIT = kit;
if (outDir) process.env.DTAAS_KIT_OUT = path.resolve(outDir);

// A deployed bundle is always a production build. In another mode, such as
// the `test` that Jest sets, JSX compiles to `react/jsx-dev-runtime`, which
// the host does not share, so the bundle would carry React's code of its own.
process.env.NODE_ENV = 'production';

// The configuration imports the SDK's TypeScript source, whose imports name
// no file extension, so only the bundling loader of Vite reads it.
process.env.VITE_CONFIG_NATIVE_IGNORE_WARNING = 'true';

await build({
  configLoader: 'bundle',
  mode: 'production',
  configFile: path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    'vite.deploy.config.ts',
  ),
});
