/**
 * The one extension host of this client: the extensions that run, with the
 * services each one receives, and their `setup` called once.
 */

import type {
  DtaasExtension,
  HostServices,
} from '@into-cps-association/dtaas-sdk';
import store from 'store/store';
import { showSnackbar } from 'store/snackbar.slice';
import registry, { env } from 'extension/extensionRegistry';
import {
  createSharedServices,
  servicesFor,
  type SharedServices,
} from 'extension/hostServices';
import createServiceDirectory from 'extension/serviceDirectory';
import startExtensions from 'extension/startExtensions';
import unavailableCore from 'extension/unavailableCore';

export const sharedServices: SharedServices = createSharedServices(
  {
    getState: () => store.getState(),
    notify: (message, severity) =>
      store.dispatch(showSnackbar({ message, severity })),
  },
  unavailableCore,
);

const hosts = new Map<string, HostServices>();

/** The services of one running extension, made once and then reused. */
export function hostFor(ext: DtaasExtension): HostServices {
  const made = hosts.get(ext.id);
  if (made) return made;
  const host = servicesFor(
    ext.id,
    sharedServices,
    env,
    directory.forExtension(ext),
  );
  hosts.set(ext.id, host);
  return host;
}

const directory = createServiceDirectory(registry.enabled, hostFor);

// Each setup reports its own failure, so this only answers a fault in the
// start itself. The user is told and the rest of the client still loads.
startExtensions(registry.enabled, hostFor).catch(() =>
  store.dispatch(
    showSnackbar({
      message: 'The extensions could not be started.',
      severity: 'error',
    }),
  ),
);

export { env };
export default registry;
