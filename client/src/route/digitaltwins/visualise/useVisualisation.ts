/**
 * The twins of the signed-in user, and the visualisation of the chosen one.
 */

import { useEffect, useState } from 'react';
import type {
  ContentsService,
  VisualisationAsset,
  VizService,
} from '@into-cps-association/dtaas-sdk';

export type Loaded =
  | { readonly state: 'loading' }
  | { readonly state: 'none' }
  | { readonly state: 'error'; readonly message: string }
  | { readonly state: 'ready'; readonly asset: VisualisationAsset };

/** The folders of the twins directory, or the error that listing gave. */
export function useTwins(contents: ContentsService, directory: string) {
  const [twins, setTwins] = useState<string[]>([]);
  const [error, setError] = useState<string>();
  useEffect(() => {
    contents
      .list(directory)
      .then((entries) =>
        setTwins(
          entries.filter((e) => e.type === 'directory').map((e) => e.name),
        ),
      )
      .catch((reason: Error) => setError(reason.message));
  }, [contents, directory]);
  return { twins, error };
}

/**
 * The visualisation.json of one twin, read through the core. The answer is
 * kept with the twin it belongs to, so a twin switched before its file
 * arrived shows as loading and never shows the old one.
 */
export function useVisualisation(
  viz: VizService,
  directory: string,
  twin: string,
): Loaded {
  const [answer, setAnswer] = useState<{ twin: string; loaded: Loaded }>();
  useEffect(() => {
    if (!twin) return;
    viz
      .load({ name: twin, path: `${directory}/${twin}`, files: [] })
      .then((asset) =>
        setAnswer({
          twin,
          loaded: asset ? { state: 'ready', asset } : { state: 'none' },
        }),
      )
      .catch((reason: Error) =>
        setAnswer({
          twin,
          loaded: { state: 'error', message: reason.message },
        }),
      );
  }, [viz, directory, twin]);
  return answer?.twin === twin ? answer.loaded : { state: 'loading' };
}
