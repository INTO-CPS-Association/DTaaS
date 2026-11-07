/**
 * Builds one example kit as a deployed extension: one classic script that an
 * operator copies to `extensions/<id>/index.js` next to the client's `env.js`.
 *
 * `buildKit.mjs` names the kit folder in `DTAAS_KIT` and may name another
 * output folder in `DTAAS_KIT_OUT`. The kit's `package.json` gives its id
 * under `dtaas.id`, so the folder name and the id may differ, as `soil-kit`
 * and `soil` do.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { kitBuildConfig } from '../src/deploy';

const examples = path.dirname(fileURLToPath(import.meta.url));
const kit = process.env.DTAAS_KIT ?? '';

if (!/^[a-z][a-z0-9-]*$/.test(kit)) {
  throw new Error(`DTAAS_KIT must name a kit folder, not "${kit}"`);
}

const root = path.join(examples, kit);
const { dtaas } = JSON.parse(
  readFileSync(path.join(root, 'package.json'), 'utf-8'),
) as { dtaas?: { id?: string } };

if (!dtaas?.id) throw new Error(`${kit}/package.json has no dtaas.id`);

export default defineConfig({
  root,
  // The kits import their own modules through the `examples/*` alias of the
  // SDK's tsconfig, so the bundle resolves it the same way.
  resolve: { alias: { examples } },
  // A kit is a library: nothing of the client's public folder belongs in it.
  publicDir: false,
  logLevel: 'warn',
  build: kitBuildConfig({
    id: dtaas.id,
    entry: path.join(root, 'src/dtaas/index.ts'),
    outDir: process.env.DTAAS_KIT_OUT,
  }),
});
