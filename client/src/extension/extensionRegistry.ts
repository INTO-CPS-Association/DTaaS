/**
 * The extensions of this client that run: the manifest in `src/extensions.ts`,
 * then the bundles the deployment lists in `env.js` (loaded by `index.tsx`
 * before this module), read once against `env.js`. A compiled-in extension
 * wins an id clash with a deployed one.
 *
 * It holds no services, so the store can mount the extensions' reducers from
 * it without importing the services, which read the store.
 */

import type { EnvRecord } from '@into-cps-association/dtaas-sdk';
import extensions from 'extensions';
import createExtensionHost from 'extension/createExtensionHost';
import { deployedExtensions } from 'extension/deployedExtensions';

export const env = (globalThis.env ?? {}) as EnvRecord;

const deployed = deployedExtensions();
const registry = createExtensionHost(
  [...extensions, ...deployed.extensions],
  env,
);

// An extension that cannot run is reported once, where an
// administrator looks, and the rest of the client carries on without it.
[...deployed.problems, ...registry.problems].forEach(({ id, reason }) =>
  // eslint-disable-next-line no-console
  console.warn(`Extension ${id} is not loaded: ${reason}`),
);

export default registry;
