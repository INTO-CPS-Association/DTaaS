/**
 * The Visualise tab of the Digital Twins page: a twin drawn from the
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

function Drawing({ loaded }: { readonly loaded: Loaded }) {
  if (loaded.state === 'loading') return <CircularProgress sx={{ m: 2 }} />;
  if (loaded.state === 'error' && loaded.signIn) {
    return (
      <Alert severity="warning">
        Your GitLab session has ended. Sign in again to see this twin.
      </Alert>
    );
  }
  if (loaded.state === 'error') {
    return <Alert severity="error">The visualisation could not be read.</Alert>;
  }
  if (loaded.state === 'none') {
    return (
      <Alert severity="info">
        This twin has no visualisation.json committed in GitLab yet. The
        Visualise tab and the signals gateway read the committed file, so commit
        it to the configured branch to see the twin here.
      </Alert>
    );
  }
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
