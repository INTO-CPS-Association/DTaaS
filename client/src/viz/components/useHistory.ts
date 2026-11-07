/**
 * Read the past of the signals a visualisation shows, for the hour before
 * the playhead, so a scrub back in time shows the readings stored on the
 * server and not only those that arrived while the page was open.
 *
 * The window moves a minute at a time, and the signals service reads only the
 * stretches its store does not hold yet, so a live page asks the gateway
 * once, for the hour before it opened.
 */

import { useEffect, useState } from 'react';
import type {
  Channel,
  EncodingPreset,
  SignalsService,
  VisualisationAsset,
} from '@into-cps-association/dtaas-sdk';
import { encodingsOf, presetsOf } from 'viz/resolve';
import { HOUR_MS } from 'viz/time';

const MINUTE_MS = 60_000;

/**
 * The channels the encodings of a visualisation read. A binding that names a
 * preset reads the channels of the preset's encodings.
 */
export function channelsOf(
  asset: VisualisationAsset,
  registered: readonly EncodingPreset[],
): Channel[] {
  const presets = presetsOf(asset, registered);
  const named = asset.encodings.flatMap((binding) =>
    (encodingsOf(binding, presets) ?? []).map(
      (encoding) => (encoding as { channel?: Channel }).channel ?? 'measured',
    ),
  );
  return [...new Set(named)];
}

/** Returns a number that changes whenever a read of the past completes. */
export default function useHistory(
  asset: VisualisationAsset,
  signals: SignalsService,
  presets: readonly EncodingPreset[],
): number {
  const minute = Math.floor(signals.playhead.use() / MINUTE_MS);
  const [loaded, setLoaded] = useState(0);
  useEffect(() => {
    let current = true;
    const paths = [...new Set(asset.encodings.map((e) => e.target))];
    const to = (minute + 1) * MINUTE_MS;
    const reads = channelsOf(asset, presets).map((channel) =>
      signals.range(paths, channel, to - HOUR_MS - MINUTE_MS, to),
    );
    Promise.all(reads)
      .then(() => current && setLoaded((n) => n + 1))
      // eslint-disable-next-line no-console
      .catch((error) => console.warn('The past signals were not read.', error));
    return () => {
      current = false;
    };
  }, [asset, signals, presets, minute]);
  return loaded;
}
