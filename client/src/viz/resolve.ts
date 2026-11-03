/**
 * Resolve every encoding of a visualisation at one instant: for each binding,
 * the visual properties its signal calls for at time `t`.
 *
 * A binding names an inline encoding or a preset. A preset may come from the
 * asset itself or from an extension, and each of its encodings applies to the
 * binding's signal. A binding whose preset nobody registered is reported, so
 * a typo in a `visualisation.json` is visible and not silently blank.
 */

import type {
  Channel,
  Encoding,
  EncodingPreset,
  ResolvedEncoding,
  Sampled,
  VisualisationAsset,
} from '@into-cps-association/dtaas-sdk';
import evaluate from 'viz/encodings';

export type ReadAt = (
  path: string,
  channel: Channel,
  t: number,
) => Sampled | undefined;

export interface ResolvedBinding {
  readonly target: string;
  readonly substrate: string;
  readonly resolved: readonly ResolvedEncoding[];
  readonly problem?: string;
}

type Binding = VisualisationAsset['encodings'][number];

function encodingsOf(
  binding: Binding,
  presets: ReadonlyMap<string, EncodingPreset>,
): Encoding[] | undefined {
  if (binding.encoding) return [binding.encoding];
  return presets.get(binding.preset ?? '')?.encodings.map((e) => e.encoding);
}

/** The visual properties one binding calls for at `t`, or why there are none. */
function resolveBinding(
  binding: Binding,
  presets: ReadonlyMap<string, EncodingPreset>,
  readAt: ReadAt,
  t: number,
): ResolvedBinding {
  const encodings = encodingsOf(binding, presets);
  const base = { target: binding.target, substrate: binding.substrate };
  if (!encodings) {
    return {
      ...base,
      resolved: [],
      problem: `Unknown preset ${binding.preset}`,
    };
  }
  const valueOn = (channel: Channel) =>
    readAt(binding.target, channel, t)?.value;
  const resolved = encodings.map((encoding) => ({
    encoding,
    t,
    value: valueOn('measured'),
    properties: evaluate(encoding, valueOn),
  }));
  return { ...base, resolved };
}

export default function resolveEncodings(
  asset: VisualisationAsset,
  registered: readonly EncodingPreset[],
  readAt: ReadAt,
  t: number,
): ResolvedBinding[] {
  const presets = new Map(
    [...registered, ...(asset.presets ?? [])].map((p) => [p.id, p]),
  );
  return asset.encodings.map((binding) =>
    resolveBinding(binding, presets, readAt, t),
  );
}
