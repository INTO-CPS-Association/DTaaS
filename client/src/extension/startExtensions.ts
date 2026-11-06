/**
 * Calls `setup` of every running extension once, after the store and the
 * host services exist. A setup that fails is reported in the console, where
 * a developer looks. The client and the other extensions carry on.
 */

import type {
  DtaasExtension,
  HostServices,
} from '@into-cps-association/dtaas-sdk';

export default function startExtensions(
  enabled: readonly DtaasExtension[],
  hostOf: (ext: DtaasExtension) => HostServices,
): Promise<void[]> {
  return Promise.all(
    enabled.map((ext) =>
      Promise.resolve()
        .then(() => ext.setup?.(hostOf(ext)))
        .catch((error: unknown) =>
          // eslint-disable-next-line no-console
          console.warn(`Extension ${ext.id} failed to set up:`, error),
        ),
    ),
  );
}
