/**
 * A stand-in for `@into-cps-association/bim-kit/dtaas` in unit tests.
 *
 * The real extension pulls in a renderer and a WebAssembly geometry kernel,
 * which a test of the menu or the routes does not need. This one declares the
 * same id, page path, menu label and icon, so the wiring is tested as it is,
 * and the package's own tests cover the page.
 */

import { lazy } from 'react';
import ApartmentIcon from '@mui/icons-material/Apartment';
import type { DtaasExtension } from '@into-cps-association/dtaas-sdk';

const BuildingsPage = lazy(async () => ({
  default: () => <h1>Buildings</h1>,
}));

export const extension: DtaasExtension = {
  id: 'bim',
  name: 'Buildings',
  version: '0.2.0',
  sdk: 1,
  routes: [{ path: '', element: BuildingsPage }],
  navigation: [
    { label: 'Buildings', path: '/bim', icon: ApartmentIcon, order: 20 },
  ],
};

export default extension;
