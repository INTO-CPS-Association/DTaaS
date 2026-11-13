/**
 * Calls `setup` of every running extension once, after the store and the
 * host services exist. A setup that fails is reported through the logger of
 * that extension, as a sentence and without the error object. The client and
 * the other extensions carry on.
 */

import type {
  DtaasExtension,
  HostServices,
} from '@into-cps-association/dtaas-sdk';

const reasonOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export default function startExtensions(
  enabled: readonly DtaasExtension[],
  hostOf: (ext: DtaasExtension) => HostServices,
): Promise<void[]> {
  return Promise.all(
    enabled.map((ext) =>
      Promise.resolve()
        .then(() => ext.setup?.(hostOf(ext)))
        .catch((error: unknown) =>
          hostOf(ext).logger.warn(`Setup failed: ${reasonOf(error)}`),
        ),
    ),
  );
}
