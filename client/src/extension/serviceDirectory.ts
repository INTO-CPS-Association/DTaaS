/**
 * Services one extension offers to another, through the host (K12).
 *
 * An extension reaches only the services it names in `requires`. Each
 * service is built once, on first use, with the services of the extension
 * that provides it. No extension imports the code of another.
 */

import type {
  DtaasExtension,
  ExtensionServices,
  HostServices,
  ProvidedService,
} from '@into-cps-association/dtaas-extensions';

export interface ServiceDirectory {
  /** The services `ext` may use, as its `host.extensions`. */
  forExtension(ext: DtaasExtension): ExtensionServices;
}

interface Offer {
  readonly provider: DtaasExtension;
  readonly service: ProvidedService;
}

function offersOf(enabled: readonly DtaasExtension[]) {
  return new Map<string, Offer>(
    enabled.flatMap((provider) =>
      (provider.provides ?? []).map((service) => [
        service.id,
        { provider, service },
      ]),
    ),
  );
}

/**
 * Builds each service once, on first use. The services being built are kept
 * in order, so a service that needs itself through `requires` is named
 * instead of overflowing the stack.
 */
function serviceBuilder(
  offers: ReadonlyMap<string, Offer>,
  hostOf: (ext: DtaasExtension) => HostServices,
) {
  const built = new Map<string, unknown>();
  const building: string[] = [];
  return (id: string) => {
    const offer = offers.get(id);
    if (!offer) throw new Error(`No enabled extension provides ${id}`);
    if (building.includes(id)) {
      const cycle = [...building.slice(building.indexOf(id)), id];
      throw new Error(`Services require each other: ${cycle.join(' -> ')}`);
    }
    if (!built.has(id)) {
      building.push(id);
      try {
        built.set(id, offer.service.create(hostOf(offer.provider)));
      } finally {
        building.pop();
      }
    }
    return built.get(id);
  };
}

export default function createServiceDirectory(
  enabled: readonly DtaasExtension[],
  hostOf: (ext: DtaasExtension) => HostServices,
): ServiceDirectory {
  const build = serviceBuilder(offersOf(enabled), hostOf);
  return {
    forExtension: (ext) => ({
      get: <T>(id: string): T => {
        if (!(ext.requires ?? []).includes(id)) {
          throw new Error(`Extension ${ext.id} does not require ${id}`);
        }
        return build(id) as T;
      },
    }),
  };
}
