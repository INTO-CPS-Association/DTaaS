/**
 * The one extension host of this client: the manifest, read once against the
 * deployment's `env.js`, with the services every extension receives.
 */

import type { EnvRecord } from '@into-cps-association/dtaas-sdk';
import extensions from 'extensions';
import store from 'store/store';
import { showSnackbar } from 'store/snackbar.slice';
import createExtensionHost from 'extension/createExtensionHost';
import {
  createSharedServices,
  servicesFor,
  type SharedServices,
} from 'extension/hostServices';
import createCore from 'viz/createCore';

const env = (globalThis.env ?? {}) as EnvRecord;

const extensionHost = createExtensionHost(extensions, env);

// A compiled-in extension that cannot run is reported once, where an
// administrator looks, and the rest of the client carries on without it.
extensionHost.problems.forEach(({ id, reason }) =>
  // eslint-disable-next-line no-console
  console.warn(`Extension ${id} is not loaded: ${reason}`),
);

// A substrate adapter an extension contributes is built with the services the
// host shares, under the host's own name in the log.
export const sharedServices: SharedServices = createSharedServices(
  {
    getState: () => store.getState(),
    notify: (message, severity) =>
      store.dispatch(showSnackbar({ message, severity })),
  },
  (contents) =>
    createCore(env, contents, extensionHost.enabled, () =>
      servicesFor('host', sharedServices, env),
    ),
);

export { env };
export default extensionHost;
