/**
 * Build settings for a deployed extension: one classic script that registers
 * the extension's entry on `DTAAS_EXTENSIONS` and takes the shared modules
 * from `DTAAS_SHARED` instead of bundling them (K9).
 *
 * This entry runs in Node, in the extension's Vite configuration. The host
 * never imports it.
 */

import {
  DEPLOYED_EXTENSIONS_GLOBAL,
  deployedKeyOf,
  SHARED_MODULES,
  SHARED_MODULES_GLOBAL,
} from '../extension/constants';

const MUI = '@mui/material';

/**
 * The global expression that holds a shared module, or undefined when the
 * extension bundles the module itself. A component path of MUI, such as
 * `@mui/material/Button`, reads the same export of the shared root, so a kit
 * may import either way and still use the host's theme.
 */
export function sharedGlobalOf(source: string): string | undefined {
  const key = (SHARED_MODULES as Record<string, string>)[source];
  if (key !== undefined) return `${SHARED_MODULES_GLOBAL}.${key}`;
  const muiPath = /^@mui\/material\/([A-Za-z]\w*)$/.exec(source);
  if (!muiPath) return undefined;
  const root = `${SHARED_MODULES_GLOBAL}.${SHARED_MODULES[MUI]}`;
  // An upper-case path names a component, a lower-case one a group of helpers
  // (styles, utils) that the root also exports.
  return /^[A-Z]/.test(muiPath[1]) ? `${root}.${muiPath[1]}` : root;
}

// The helper inside the MUI icons package that every icon calls.
const MUI_ICON_HELPER =
  /[\\/]@mui[\\/]icons-material[\\/]utils[\\/]createSvgIcon\.m?js$/;

/**
 * Every MUI icon calls a helper that re-exports `createSvgIcon` from
 * `@mui/material/SvgIcon`. That path maps to the shared SvgIcon component,
 * which lacks the helper, while the shared root has it. This replaces the
 * helper with a read of the root, so a kit may import any icon of
 * `@mui/icons-material` and the bundle carries only that icon.
 */
export const muiIconsPlugin = {
  name: 'dtaas-mui-icons',
  load(id: string) {
    if (!MUI_ICON_HELPER.test(id)) return null;
    return `import { createSvgIcon } from '${MUI}';\nexport default createSvgIcon;\n`;
  },
};

export interface KitBuildOptions {
  /** The extension's id, as in its `defineExtension` call. */
  readonly id: string;
  /** The module that exports `extension`, such as `src/dtaas/index.ts`. */
  readonly entry: string;
  /** Where the bundle goes. Defaults to `dist/deploy/<id>`. */
  readonly outDir?: string;
}

/**
 * The `build` part of a Vite configuration for a deployed extension. The
 * result is `<outDir>/index.js`, which an operator copies to
 * `extensions/<id>/index.js` next to the client.
 */
export function kitBuildConfig({ id, entry, outDir }: KitBuildOptions) {
  const isShared = (source: string) => sharedGlobalOf(source) !== undefined;
  return {
    outDir: outDir ?? `dist/deploy/${id}`,
    emptyOutDir: true,
    lib: {
      entry,
      formats: ['iife' as const],
      name: `${DEPLOYED_EXTENSIONS_GLOBAL}.${deployedKeyOf(id)}`,
      fileName: () => 'index.js',
    },
    rollupOptions: {
      external: isShared,
      plugins: [muiIconsPlugin],
      output: {
        globals: (source: string) => sharedGlobalOf(source) ?? source,
        extend: true,
        exports: 'named' as const,
      },
    },
  };
}
