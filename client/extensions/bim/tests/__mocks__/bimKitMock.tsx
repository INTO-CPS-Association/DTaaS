/**
 * A stand-in for `@into-cps-association/bim-kit/dtaas`, which pulls in a
 * renderer and a WebAssembly geometry kernel. It declares what this package
 * builds on: the id, a page, a preset on `aec` and the `ifc-guid` anchor.
 */

import { lazy } from 'react';
import type { DtaasExtension } from '@into-cps-association/dtaas-sdk';

const BuildingsPage = lazy(async () => ({
  default: () => <h1>Buildings</h1>,
}));

export const extension: DtaasExtension = {
  id: 'bim',
  name: 'Buildings',
  // Marks the stand-in, so the build scan can refuse a bundle that has it.
  version: '0.2.0-test-stand-in',
  sdk: 1,
  routes: [{ path: '', element: BuildingsPage }],
  navigation: [{ label: 'Buildings', path: '/bim', order: 20 }],
  visualisation: {
    detect: () => true,
    anchorKinds: [
      { kind: 'ifc-guid', substrates: ['aec'], resolve: () => null },
    ],
    presets: [
      {
        id: 'bim.temperature',
        label: 'Temperature',
        substrate: 'aec',
        encodings: [],
      },
    ],
  },
};

export default extension;
