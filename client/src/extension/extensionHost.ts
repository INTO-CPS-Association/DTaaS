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
import createCore from 'viz/createCore';

// A substrate adapter is built with the services the host shares, under the
// host's own name in the log. It asks no extension for a service.
const NO_SERVICES = {
  get: (id: string): never => {
    throw new Error(`A substrate gets no service of an extension: ${id}`);
  },
};

export const sharedServices: SharedServices = createSharedServices(
  {
    getState: () => store.getState(),
    notify: (message, severity) =>
      store.dispatch(showSnackbar({ message, severity })),
  },
  (contents) =>
    createCore(env, contents, registry.enabled, () =>
      servicesFor('host', sharedServices, env, NO_SERVICES),
    ),
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

startExtensions(registry.enabled, hostFor);

export { env };
export default registry;
