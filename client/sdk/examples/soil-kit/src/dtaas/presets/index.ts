import type { EncodingPreset } from '@into-cps-association/dtaas-sdk';
import { QUANTITIES, SOIL_PROFILE } from 'examples/soil-kit/src/core';

/** A colour scale over the kit's range of one quantity, at every depth. */
function presetOf(
  id: string,
  quantity: string,
  description: string,
): EncodingPreset {
  const { label, scheme, domain } = QUANTITIES[quantity];
  return {
    id,
    label,
    description,
    substrate: SOIL_PROFILE,
    encodings: [
      {
        target: `*/${quantity}`,
        encoding: { type: 'colorScale', domain: [...domain], scheme },
      },
    ],
  };
}

const presets: EncodingPreset[] = [
  presetOf(
    'soil.moisture',
    'soil_moisture',
    'Colours each depth by its volumetric water content, from dry to wet.',
  ),
  presetOf(
    'soil.temperature',
    'soil_temperature',
    'Colours each depth by its temperature.',
  ),
];

export default presets;
