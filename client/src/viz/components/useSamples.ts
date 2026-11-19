/**
 * Re-render whenever a sample arrives for any signal a visualisation shows,
 * on any channel it reads, so the drawing never lags behind the store.
 */

import { useEffect, useState } from 'react';
import {
  CHANNELS,
  type SignalsService,
  type VisualisationAsset,
} from '@into-cps-association/dtaas-sdk';

export default function useSamples(
  asset: VisualisationAsset,
  signals: SignalsService,
): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const paths = [...new Set(asset.encodings.map((e) => e.target))];
    const bump = () => setVersion((v) => v + 1);
    const stops = CHANNELS.map((channel) =>
      signals.subscribe(paths, channel, bump),
    );
    return () => stops.forEach((stop) => stop());
  }, [asset, signals]);
  return version;
}
