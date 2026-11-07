/**
 * Deployed extensions: bundles an operator places next to the client and
 * lists in `REACT_APP_EXTENSIONS_DEPLOYED` in `env.js`, loaded when the client
 * starts, without a rebuild (K9).
 *
 * A bundle is built with `kitBuildConfig` from `@into-cps-association/dtaas-sdk/deploy`.
 * It is a classic script that registers `{ extension }` on `DTAAS_EXTENSIONS`
 * and takes React, the router, MUI, zod and the contract from `DTAAS_SHARED`,
 * which this module fills before the first bundle runs.
 *
 * A bundle runs with the rights of the client itself, as a compiled-in
 * extension does. That is why only paths under `extensions/<id>/` on the
 * client's own origin are accepted: the operator who writes `env.js` also
 * decides which files the web server holds there.
 */

import {
  DEPLOYED_EXTENSIONS_GLOBAL,
  deployedKeyOf,
  EXTENSIONS_DEPLOYED_KEY,
  SHARED_MODULES,
  SHARED_MODULES_GLOBAL,
  type DtaasExtension,
  type EnvRecord,
} from '@into-cps-association/dtaas-sdk';
import type { ExtensionProblem } from 'extension/createExtensionHost';

/** `extensions/<id>/<file>.js`, with an id as `validateExtension` takes it. */
const DEPLOYED_PATH = /^extensions\/([a-z][a-z0-9-]*)\/[\w.-]+\.js$/;

type SharedKey = (typeof SHARED_MODULES)[keyof typeof SHARED_MODULES];

/**
 * The host's own copy of each shared module. Each import is dynamic, so a
 * deployment without deployed extensions never downloads the namespaces.
 */
const SHARED_IMPORTS: Record<SharedKey, () => Promise<unknown>> = {
  react: () => import('react'),
  reactJsxRuntime: () => import('react/jsx-runtime'),
  reactDom: () => import('react-dom'),
  reactRouterDom: () => import('react-router-dom'),
  muiMaterial: () => import('@mui/material'),
  dtaasSdk: () => import('@into-cps-association/dtaas-sdk'),
  dtaasSdkSchema: () => import('@into-cps-association/dtaas-sdk/schema'),
  zod: () => import('zod'),
};

export interface DeployedPath {
  readonly id: string;
  readonly path: string;
}

export interface DeployedResult {
  readonly extensions: readonly DtaasExtension[];
  readonly problems: readonly ExtensionProblem[];
}

/** The listed paths that are well formed, and a problem for each other one. */
export function deployedPaths(env: EnvRecord): {
  paths: DeployedPath[];
  problems: ExtensionProblem[];
} {
  const list = env[EXTENSIONS_DEPLOYED_KEY];
  const entries =
    typeof list === 'string'
      ? list
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean)
      : [];
  const paths: DeployedPath[] = [];
  const problems: ExtensionProblem[] = [];
  entries.forEach((path) => {
    const match = DEPLOYED_PATH.exec(path);
    if (match) paths.push({ id: match[1], path });
    else
      problems.push({
        id: path,
        reason: `${EXTENSIONS_DEPLOYED_KEY} accepts only extensions/<id>/<file>.js`,
      });
  });
  return { paths, problems };
}

/** Fill `DTAAS_SHARED` with the host's copy of every shared module. */
export async function provideSharedModules(
  target: Record<string, unknown> = globalThis,
): Promise<void> {
  const keys = Object.keys(SHARED_IMPORTS) as SharedKey[];
  const modules = await Promise.all(keys.map((key) => SHARED_IMPORTS[key]()));
  target[SHARED_MODULES_GLOBAL] = Object.fromEntries(
    keys.map((key, index) => [key, modules[index]]),
  );
}

/** Run one classic script from the client's origin. */
export function loadScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.async = false;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`${url} could not be loaded`));
    document.head.appendChild(script);
  });
}

export interface LoadOptions {
  readonly load?: (url: string) => Promise<void>;
  readonly provide?: () => Promise<void>;
  readonly registry?: () => Record<string, unknown> | undefined;
}

const globalRegistry = () =>
  (globalThis as Record<string, unknown>)[DEPLOYED_EXTENSIONS_GLOBAL] as
    Record<string, unknown> | undefined;

/** The extension a loaded bundle registered, or why it is not usable. */
function registered(
  { id, path }: DeployedPath,
  registry: Record<string, unknown> | undefined,
): DtaasExtension | string {
  const entry = registry?.[deployedKeyOf(id)] as
    { extension?: DtaasExtension } | undefined;
  const extension = entry?.extension;
  if (!extension) return `${path} registered no extension`;
  if (extension.id !== id) {
    return `${path} declares the id ${String(extension.id)}, not ${id}`;
  }
  return extension;
}

/**
 * Load every listed bundle, in order, and return the extensions they
 * registered. A bundle that fails is reported and the others still load.
 */
export async function loadDeployedExtensions(
  env: EnvRecord,
  {
    load = loadScript,
    provide = provideSharedModules,
    registry = globalRegistry,
  }: LoadOptions = {},
): Promise<DeployedResult> {
  const { paths, problems } = deployedPaths(env);
  if (paths.length === 0) return { extensions: [], problems };
  await provide();
  const extensions: DtaasExtension[] = [];
  for (const deployed of paths) {
    try {
      // Sequential, so the menu follows the order of the list.
      // eslint-disable-next-line no-await-in-loop
      await load(`/${deployed.path}`);
      const result = registered(deployed, registry());
      if (typeof result === 'string') {
        problems.push({ id: deployed.id, reason: result });
      } else extensions.push(result);
    } catch (error) {
      problems.push({ id: deployed.id, reason: (error as Error).message });
    }
  }
  return { extensions, problems };
}

let deployed: DeployedResult = { extensions: [], problems: [] };

/** Keep what the start-up loaded, for the registry to read. */
export function setDeployedExtensions(result: DeployedResult): void {
  deployed = result;
}

/** What the start-up loaded. Empty before it ran and in the tests. */
export function deployedExtensions(): DeployedResult {
  return deployed;
}
