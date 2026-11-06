/**
 * A tab an extension adds to the Digital Twins page. The person picks one of
 * their twins, the extension's `applies` decides whether the tab has
 * something to show for it. The tab's page then gets the twin and the
 * services of its own extension.
 */

import { Suspense, useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import {
  HostProvider,
  type DigitalTwinSummary,
} from '@into-cps-association/dtaas-sdk';
import ErrorBoundary from 'components/ErrorBoundary';
import { hostFor, sharedServices } from 'extension/extensionHost';
import type { MountedTab } from 'extension/createExtensionHost';
import TwinPicker from 'route/digitaltwins/twins/TwinPicker';
import {
  logged,
  twinSummary,
  useTwins,
} from 'route/digitaltwins/twins/useTwins';

const { contents, library } = sharedServices;
const DIRECTORY = library.conventions.digitalTwinsDirectory;

type Chosen =
  | { readonly state: 'loading' }
  | { readonly state: 'error' }
  | { readonly state: 'ready'; readonly dt: DigitalTwinSummary }
  | { readonly state: 'other' };

async function choose(tab: MountedTab['tab'], twin: string): Promise<Chosen> {
  const dt = await twinSummary(contents, DIRECTORY, twin);
  return (await tab.applies(dt)) ? { state: 'ready', dt } : { state: 'other' };
}

/** The chosen twin, once its files are read and the tab has judged it. */
function useChosen(tab: MountedTab['tab'], twin: string): Chosen {
  const [answer, setAnswer] = useState<{ twin: string; chosen: Chosen }>();
  useEffect(() => {
    if (!twin) return;
    choose(tab, twin)
      .then((chosen) => setAnswer({ twin, chosen }))
      .catch((reason: Error) => {
        logged('The digital twin could not be read.', reason);
        setAnswer({ twin, chosen: { state: 'error' } });
      });
  }, [tab, twin]);
  return answer?.twin === twin ? answer.chosen : { state: 'loading' };
}

function TabBody({ mounted, chosen }: { mounted: MountedTab; chosen: Chosen }) {
  if (chosen.state === 'loading') return <CircularProgress sx={{ m: 2 }} />;
  if (chosen.state === 'error') {
    return <Alert severity="error">The digital twin could not be read.</Alert>;
  }
  if (chosen.state === 'other') {
    return (
      <Alert severity="info">
        {mounted.tab.label} has nothing to show for this digital twin.
      </Alert>
    );
  }
  const Page = mounted.tab.element;
  return (
    <ErrorBoundary>
      <HostProvider services={hostFor(mounted.extension)}>
        <Suspense fallback={<CircularProgress sx={{ m: 2 }} />}>
          <Page dt={chosen.dt} />
        </Suspense>
      </HostProvider>
    </ErrorBoundary>
  );
}

function DigitalTwinTabPage({ mounted }: { readonly mounted: MountedTab }) {
  const { twins, error } = useTwins(contents, DIRECTORY);
  const [twin, setTwin] = useState('');
  const chosen = useChosen(mounted.tab, twin);
  if (error) {
    return (
      <Alert severity="error">The digital twins could not be listed.</Alert>
    );
  }
  const id = `${mounted.extension.id}-${mounted.tab.id}`;
  return (
    <>
      <TwinPicker id={id} twins={twins} twin={twin} onChange={setTwin} />
      {twin && <TabBody mounted={mounted} chosen={chosen} />}
    </>
  );
}

export default DigitalTwinTabPage;
