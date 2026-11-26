/**
 * `node tests/fixtures/kit/build.mjs <outDir>`: build the fixture kit as a
 * deployed extension with the SDK's own `kitBuildConfig`, from its TypeScript
 * source, so the SDK tests its `./deploy` entry without depending on a kit.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const [outDir] = process.argv.slice(2);
if (!outDir) {
  process.stderr.write('Usage: node tests/fixtures/kit/build.mjs <outDir>\n');
  process.exit(2);
}

// The configuration reads the output folder from the environment, since Vite
// takes no arguments of its own for a configuration file.
process.env.DTAAS_KIT_OUT = path.resolve(outDir);

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
    'vite.config.ts',
  ),
});
