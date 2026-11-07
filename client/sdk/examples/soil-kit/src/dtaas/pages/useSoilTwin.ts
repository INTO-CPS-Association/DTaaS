import { useEffect, useState } from 'react';
import type {
  DigitalTwinSummary,
  HostServices,
} from '@into-cps-association/dtaas-sdk';
import { profilesOf, type SoilSensor } from 'examples/soil-kit/src/core';

export type SoilTwin =
  | { readonly status: 'loading' }
  | { readonly status: 'missing'; readonly path: string }
  | { readonly status: 'failed'; readonly message: string }
  | {
      readonly status: 'ready';
      readonly name: string;
      readonly profiles: ReadonlyMap<string, SoilSensor[]>;
    };

/** The twin folder the configuration names, in the library. */
export const twinSummary = (
  host: HostServices,
  twin: string,
): DigitalTwinSummary => ({
  name: twin,
  path: `${host.library.conventions.digitalTwinsDirectory}/${twin}`,
  files: ['visualisation.json'],
  domain: 'soil',
});

/** The profiles of the soil twin, from the anchors of its visualisation. */
export default function useSoilTwin(host: HostServices, twin: string) {
  const [state, setState] = useState<SoilTwin>({ status: 'loading' });
  useEffect(() => {
    let current = true;
    const dt = twinSummary(host, twin);
    const show = (next: SoilTwin) => current && setState(next);
    host.viz
      .load(dt)
      .then((asset) =>
        show(
          asset
            ? {
                status: 'ready',
                name: asset.name,
                profiles: profilesOf(asset.anchors),
              }
            : { status: 'missing', path: dt.path },
        ),
      )
      .catch((error: Error) =>
        show({ status: 'failed', message: error.message }),
      );
    return () => {
      current = false;
    };
  }, [host, twin]);
  return state;
}
