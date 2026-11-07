import { lazy } from 'react';
import {
  defineExtension,
  type LazySubstrateAdapterSpec,
} from '@into-cps-association/dtaas-sdk';
import {
  isSoilTwin,
  SOIL_DEPTH,
  SOIL_PROFILE,
} from 'examples/soil-kit/src/core';
import anchorKinds from 'examples/soil-kit/src/dtaas/anchors';
import configSchema from 'examples/soil-kit/src/dtaas/config';
import presets from 'examples/soil-kit/src/dtaas/presets';

/** Loaded only when a visualisation draws a soil profile. */
export const SOIL_PROFILE_SUBSTRATE: LazySubstrateAdapterSpec = {
  id: SOIL_PROFILE,
  supports: [SOIL_DEPTH],
  load: () =>
    import('examples/soil-kit/src/dtaas/substrate/soilProfileSubstrate'),
};

/** The only object the host imports: `import { extension } from '<kit>/dtaas'`. */
export const extension = defineExtension({
  id: 'soil',
  name: 'Soil',
  version: '0.1.0',
  sdk: 1,
  apiRange: '^1.4',
  routes: [
    {
      path: '',
      element: lazy(() => import('examples/soil-kit/src/dtaas/pages/SoilPage')),
    },
  ],
  navigation: [{ label: 'Soil', path: '/soil', order: 110 }],
  config: { schema: configSchema },
  setup: (host) => {
    host.config(configSchema);
    host.logger.info('soil-kit ready');
  },
  visualisation: {
    detect: isSoilTwin,
    anchorKinds,
    presets,
    substrates: [SOIL_PROFILE_SUBSTRATE],
  },
});

export default extension;
