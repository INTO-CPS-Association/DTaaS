/**
 * Builds the kit as a deployed extension: one classic script that an operator
 * copies to `extensions/<id>/index.js` next to the client's `env.js`.
 * `DTAAS_KIT_OUT` may name another output folder.
 */

import { defineConfig } from 'vite';
import { kitBuildConfig } from '@into-cps-association/dtaas-sdk/deploy';
import pkg from './package.json' with { type: 'json' };

// A deployed bundle is always a production build. In another mode, such as
// the `test` that Jest sets, JSX compiles to `react/jsx-dev-runtime`, which
// the host does not share, so the bundle would carry React's code of its own.
process.env.NODE_ENV = 'production';

export default defineConfig({
  // A kit is a library: no public folder belongs in it.
  publicDir: false,
  logLevel: 'warn',
  mode: 'production',
  build: kitBuildConfig({
    id: pkg.dtaas.id,
    entry: 'src/dtaas/index.ts',
    outDir: process.env.DTAAS_KIT_OUT,
  }),
});
