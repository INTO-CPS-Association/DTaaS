/**
 * The extensions of this client that run: the manifest in `src/extensions.ts`
 * read once against the deployment's `env.js`.
 *
 * It holds no services, so the store can mount the extensions' reducers from
 * it without importing the services, which read the store.
 */

import type { EnvRecord } from '@into-cps-association/dtaas-sdk';
import extensions from 'extensions';
import createExtensionHost from 'extension/createExtensionHost';

export const env = (globalThis.env ?? {}) as EnvRecord;

const registry = createExtensionHost(extensions, env);

// A compiled-in extension that cannot run is reported once, where an
// administrator looks, and the rest of the client carries on without it.
registry.problems.forEach(({ id, reason }) =>
  // eslint-disable-next-line no-console
  console.warn(`Extension ${id} is not loaded: ${reason}`),
);

export default registry;
