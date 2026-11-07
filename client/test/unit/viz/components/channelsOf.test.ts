import type {
  EncodingPreset,
  VisualisationAsset,
} from '@into-cps-association/dtaas-sdk';
import { channelsOf } from 'viz/components/useHistory';

const scale = (channel?: 'measured' | 'setpoint') => ({
  type: 'colorScale' as const,
  domain: [0, 1] as [number, number],
  scheme: 'heat',
  ...(channel ? { channel } : {}),
});

const preset: EncodingPreset = {
  id: 'kit.target',
  label: 'Target',
  substrate: 'image',
  encodings: [{ target: 'x', encoding: scale('setpoint') }],
};

function assetWith(
  encodings: VisualisationAsset['encodings'],
): VisualisationAsset {
  return { encodings } as unknown as VisualisationAsset;
}

describe('channelsOf', () => {
  it('reads the channel of each inline encoding, measured by default', () => {
    const asset = assetWith([
      { target: 'a', substrate: 'image', encoding: scale() },
      { target: 'b', substrate: 'image', encoding: scale('setpoint') },
    ] as VisualisationAsset['encodings']);

    expect(channelsOf(asset, [])).toEqual(['measured', 'setpoint']);
  });

  it('reads the channels of a preset a binding names', () => {
    const asset = assetWith([
      { target: 'a', substrate: 'image', preset: 'kit.target' },
    ] as VisualisationAsset['encodings']);

    expect(channelsOf(asset, [preset])).toEqual(['setpoint']);
  });

  it('reads nothing for a preset nobody registered, instead of failing', () => {
    const asset = assetWith([
      { target: 'a', substrate: 'image', preset: 'missing' },
    ] as VisualisationAsset['encodings']);

    expect(channelsOf(asset, [])).toEqual([]);
  });
});
