import type { DtaasExtension } from './extension.types';

/** Identity helper that gives an extension literal its contract type. */
const defineExtension = <S = unknown>(
  extension: DtaasExtension<S>,
): DtaasExtension<S> => extension;

export default defineExtension;
