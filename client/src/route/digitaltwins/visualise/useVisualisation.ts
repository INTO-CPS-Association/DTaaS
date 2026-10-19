/**
 * The twins of the signed-in user, and the visualisation of the chosen one.
 */

import { useEffect, useState } from 'react';
import type {
  ContentsService,
  VisualisationAsset,
  VizService,
} from '@into-cps-association/dtaas-sdk';

/**
 * The detail of a failure goes to the console, where a developer looks, and
 * the page shows a plain sentence, since the detail may name server paths.
 */
function logged(what: string, reason: Error): string {
  // eslint-disable-next-line no-console
  console.warn(what, reason);
  return reason.message;
}

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
      .catch((reason: Error) =>
        setError(logged('The digital twins could not be listed.', reason)),
      );
  }, [contents, directory]);
  return { twins, error };
}

/** The visualisation of one twin, or that it has none. */
function loadTwin(
  viz: VizService,
  directory: string,
  twin: string,
): Promise<Loaded> {
  return viz
    .load({ name: twin, path: `${directory}/${twin}`, files: [] })
    .then((asset): Loaded =>
      asset ? { state: 'ready', asset } : { state: 'none' },
    );
}

/** Why a twin's visualisation could not be read, for the screen. */
const failed = (reason: Error): Loaded => ({
  state: 'error',
  message: logged('The visualisation could not be read.', reason),
});

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
    loadTwin(viz, directory, twin)
      .then((loaded) => setAnswer({ twin, loaded }))
      .catch((reason: Error) => setAnswer({ twin, loaded: failed(reason) }));
  }, [viz, directory, twin]);
  return answer?.twin === twin ? answer.loaded : { state: 'loading' };
}
