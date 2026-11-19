/**
 * The View tab of the Digital Twins preview page: a twin drawn from the
 * `visualisation.json` committed in its folder, coloured by its live signals,
 * with one timeline for every pane. The committed copy is the one the signals
 * gateway authorises against, so both read the same declaration.
 */

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { sharedServices } from 'extension/extensionHost';
import TwinViewer from 'viz/components/TwinViewer';
import Timeline from 'viz/components/Timeline';
import {
  useVisualisation,
  type Loaded,
} from 'route/digitaltwins/visualise/useVisualisation';
import TwinPicker from 'route/digitaltwins/twins/TwinPicker';
import { useTwins } from 'route/digitaltwins/twins/useTwins';
import committedReader from 'route/digitaltwins/visualise/committedVisualisation';

const { contents, library, signals, viz } = sharedServices;
const DIRECTORY = library.conventions.digitalTwinsDirectory;
const readCommitted = committedReader(sharedServices);

type NotReady = Exclude<Loaded, { state: 'ready' }>;

/** What the tab shows while the twin's visualisation is not ready. */
function Waiting({ loaded }: { readonly loaded: NotReady }) {
  if (loaded.state === 'loading') return <CircularProgress sx={{ m: 2 }} />;
  if (loaded.state === 'none') {
    return (
      <Alert severity="info">
        This twin has no visualisation.json committed in GitLab yet. The View
        tab and the signals gateway read the committed file, so commit it to the
        configured branch to see the twin here.
      </Alert>
    );
  }
  if (loaded.signIn) {
    return (
      <Alert severity="warning">
        Your GitLab session has ended. Sign in again to see this twin.
      </Alert>
    );
  }
  return <Alert severity="error">The visualisation could not be read.</Alert>;
}

function Drawing({ loaded }: { readonly loaded: Loaded }) {
  if (loaded.state !== 'ready') return <Waiting loaded={loaded} />;
  const paths = [...new Set(loaded.asset.encodings.map((e) => e.target))];
  return (
    <>
      <Timeline signals={signals} paths={paths} />
      <TwinViewer asset={loaded.asset} signals={signals} viz={viz} />
    </>
  );
}

function VisualiseTab() {
  const { twins, error } = useTwins(contents, DIRECTORY);
  const [twin, setTwin] = useState('');
  const loaded = useVisualisation(readCommitted, twin);
  if (error) {
    return (
      <Alert severity="error">The digital twins could not be listed.</Alert>
    );
  }
  return (
    <>
      <TwinPicker id="visualise" twins={twins} twin={twin} onChange={setTwin} />
      {twin && <Drawing loaded={loaded} />}
    </>
  );
}

export default VisualiseTab;
