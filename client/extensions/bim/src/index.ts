/**
 * The bim extension of this client: the Buildings page and the building
 * domain of `bim-kit`, with the `aec` substrate that draws a building model
 * on the Visualise tab.
 *
 * The substrate lives here, outside the client core, because it is building
 * code (K5). It is loaded only when a visualisation draws a building, so the
 * renderer stays out of the client's entry chunk.
 */

import {
  defineExtension,
  type LazySubstrateAdapterSpec,
} from '@into-cps-association/dtaas-sdk';
import { extension as kit } from '@into-cps-association/bim-kit/dtaas';

export const AEC_SUBSTRATE: LazySubstrateAdapterSpec = {
  id: 'aec',
  supports: ['ifc-guid'],
  load: () => import('./aec/aecSubstrate'),
};

export const extension = defineExtension({
  ...kit,
  visualisation: kit.visualisation && {
    ...kit.visualisation,
    substrates: [...(kit.visualisation.substrates ?? []), AEC_SUBSTRATE],
  },
});

export default extension;
