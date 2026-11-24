import {
  DEPLOYED_EXTENSIONS_GLOBAL,
  SHARED_MODULES_GLOBAL,
} from '../extension/constants';
import type { DtaasExtension } from '../extension/extension.types';

/** What a deployed bundle registers, by the key of its extension. */
export type DeployedRegistry = Record<string, { extension: DtaasExtension }>;

/**
 * Run the code of a deployed bundle as the browser runs a classic script and
 * return what it registered under `DTAAS_EXTENSIONS`. `shared` holds the
 * modules the host shares, by their keys under `DTAAS_SHARED`, such as
 * `{ react, reactJsxRuntime, dtaasSdk, zod }`. Only the modules the kit
 * imports are needed.
 */
export default function runDeployedBundle(
  code: string,
  shared: Record<string, unknown>,
): DeployedRegistry {
  const window: Record<string, unknown> = {};
  // A classic script runs with `this` as the window. The Function constructor
  // runs the bundle the same way, with the shared modules as its one global.
  // eslint-disable-next-line no-new-func
  new Function(SHARED_MODULES_GLOBAL, code).call(window, shared);
  return (window[DEPLOYED_EXTENSIONS_GLOBAL] ?? {}) as DeployedRegistry;
}
