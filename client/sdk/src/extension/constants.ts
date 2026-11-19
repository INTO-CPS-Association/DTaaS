/** Major version of the extension contract. Extensions declare it as `sdk`. */
export const SDK_MAJOR = 1 as const;

/**
 * The version of the extension API this package describes, which a host built
 * on it implements. An extension's `apiRange` is checked against it. A new
 * contribution point or service raises the minor number, and a change that an
 * existing extension would notice raises the major number (K10).
 */
export const SDK_VERSION = '1.4.0';

/** The value channels every signal can carry (R5). */
export const CHANNELS = [
  'measured',
  'simulated',
  'predicted',
  'setpoint',
] as const;

/**
 * Substrates owned by the common core. A kit may never register these ids.
 * `aec` is not one of them: the bim extension contributes it.
 */
export const STANDARD_SUBSTRATES = [
  'image',
  'mesh',
  'video',
  'embed',
  'geo',
  'field',
] as const;

/** Anchor kinds named by the visualisation report. Kits may add others. */
export const STANDARD_ANCHOR_KINDS = [
  'ifc-guid',
  'gltf-node',
  'usd-prim',
  'instance-id',
  'geo',
  'image-point',
  'image-region',
  'image-plane',
  'video-panel',
  'tb-entity',
] as const;

/** First path segments of the DTaaS core routes and host-owned state keys. */
export const RESERVED_EXTENSION_IDS: readonly string[] = [
  'config',
  'library',
  'digitaltwins',
  'automation',
  'account',
  'workbench',
  'preview',
  'insights',
  'ext',
  'viz',
];

/** env.js key listing compiled-in extensions a deployment switches off. */
export const EXTENSIONS_DISABLED_KEY = 'REACT_APP_EXTENSIONS_DISABLED';

/** Prefix of the env.js keys that belong to one extension. */
export const EXTENSION_ENV_PREFIX = 'REACT_APP_EXT_';

/**
 * env.js key listing the bundles of deployed extensions, which the client
 * loads when it starts, for example `'extensions/soil/index.js'`. Each path
 * sits under `extensions/<id>/` on the client's own origin (K9).
 */
export const EXTENSIONS_DEPLOYED_KEY = 'REACT_APP_EXTENSIONS_DEPLOYED';

/** Global object a deployed extension's bundle registers its entry on. */
export const DEPLOYED_EXTENSIONS_GLOBAL = 'DTAAS_EXTENSIONS';

/** Global object the host fills with the modules it shares. */
export const SHARED_MODULES_GLOBAL = 'DTAAS_SHARED';

/**
 * Modules a deployed extension takes from the host instead of bundling its
 * own copy, by the key it reads under `DTAAS_SHARED`. One copy of React, the
 * router, MUI and this contract keeps their contexts, such as the theme and
 * `HostProvider`, the same on both sides.
 */
export const SHARED_MODULES = {
  react: 'react',
  'react/jsx-runtime': 'reactJsxRuntime',
  'react-dom': 'reactDom',
  'react-router-dom': 'reactRouterDom',
  '@mui/material': 'muiMaterial',
  '@into-cps-association/dtaas-sdk': 'dtaasSdk',
  '@into-cps-association/dtaas-sdk/schema': 'dtaasSdkSchema',
  zod: 'zod',
} as const;

/**
 * The key of a deployed extension under `DTAAS_EXTENSIONS`. An id may hold a
 * hyphen, which a dotted global name cannot.
 */
export const deployedKeyOf = (id: string): string => id.replace(/-/g, '_');
