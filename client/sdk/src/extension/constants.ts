/** Major version of the extension contract. Extensions declare it as `sdk`. */
export const SDK_MAJOR = 1 as const;

/** The value channels every signal can carry (R5). */
export const CHANNELS = [
  'measured',
  'simulated',
  'predicted',
  'setpoint',
] as const;

/** Substrates owned by the common core; a kit may never register these ids. */
export const STANDARD_SUBSTRATES = [
  'image',
  'aec',
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
