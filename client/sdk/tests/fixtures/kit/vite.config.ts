/**
 * Builds the fixture kit as a deployed extension: one classic script that an
 * operator would copy to `extensions/fixture/index.js` next to the client's
 * `env.js`. `build.mjs` names the output folder in `DTAAS_KIT_OUT`.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { kitBuildConfig } from '../../../src/deploy';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root,
  // A kit is a library: nothing of a public folder belongs in it.
  publicDir: false,
  logLevel: 'warn',
  build: kitBuildConfig({
    id: 'fixture',
    entry: path.join(root, 'src/index.ts'),
    outDir: process.env.DTAAS_KIT_OUT,
  }),
});
