/**
 * The visualisation of the digital twin chosen on the Visualise tab.
 */

import { useEffect, useState } from 'react';
import type { VisualisationAsset } from '@into-cps-association/dtaas-sdk';
import { logged } from 'route/digitaltwins/twins/useTwins';
import type { ReadDeclaration } from 'route/digitaltwins/visualise/committedVisualisation';

export type Loaded =
  | { readonly state: 'loading' }
  | { readonly state: 'none' }
  | { readonly state: 'error'; readonly message: string }
  | { readonly state: 'ready'; readonly asset: VisualisationAsset };

/** The visualisation of one twin, or that it has none. */
function loadTwin(read: ReadDeclaration, twin: string): Promise<Loaded> {
  return read(twin).then((asset): Loaded =>
    asset ? { state: 'ready', asset } : { state: 'none' },
  );
}

/** Why a twin's visualisation could not be read, for the screen. */
const failed = (reason: Error): Loaded => ({
  state: 'error',
  message: logged('The visualisation could not be read.', reason),
});

/**
 * The visualisation.json of one twin, read by `read`. The answer is kept
 * with the twin it belongs to, so a twin switched before its file arrived
 * shows as loading and never shows the old one.
 */
export function useVisualisation(read: ReadDeclaration, twin: string): Loaded {
  const [answer, setAnswer] = useState<{ twin: string; loaded: Loaded }>();
  useEffect(() => {
    if (!twin) return;
    loadTwin(read, twin)
      .then((loaded) => setAnswer({ twin, loaded }))
      .catch((reason: Error) => setAnswer({ twin, loaded: failed(reason) }));
  }, [read, twin]);
  return answer?.twin === twin ? answer.loaded : { state: 'loading' };
}
