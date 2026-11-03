/**
 * The Visualise tab of the Digital Twins page: a twin drawn from the
 * `visualisation.json` in its folder, coloured by its live signals, with one
 * timeline for every pane.
 */

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import { sharedServices } from 'extension/extensionHost';
import TwinViewer from 'viz/components/TwinViewer';
import Timeline from 'viz/components/Timeline';
import {
  useTwins,
  useVisualisation,
  type Loaded,
} from 'route/digitaltwins/visualise/useVisualisation';

const { contents, library, signals, viz } = sharedServices;
const DIRECTORY = library.conventions.digitalTwinsDirectory;

function Drawing({ loaded }: { readonly loaded: Loaded }) {
  if (loaded.state === 'loading') return <CircularProgress sx={{ m: 2 }} />;
  if (loaded.state === 'error') {
    return <Alert severity="error">The visualisation could not be read.</Alert>;
  }
  if (loaded.state === 'none') {
    return (
      <Alert severity="info">
        This twin has no visualisation.json in its folder yet.
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

interface TwinPickerProps {
  readonly twins: readonly string[];
  readonly twin: string;
  readonly onChange: (twin: string) => void;
}

function TwinPicker({ twins, twin, onChange }: TwinPickerProps) {
  return (
    <FormControl sx={{ minWidth: '16rem', mb: 2 }}>
      <InputLabel id="visualise-twin">Digital Twin</InputLabel>
      <Select
        labelId="visualise-twin"
        label="Digital Twin"
        value={twin}
        onChange={(event) => onChange(event.target.value)}
      >
        {twins.map((name) => (
          <MenuItem key={name} value={name}>
            {name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

function VisualiseTab() {
  const { twins, error } = useTwins(contents, DIRECTORY);
  const [twin, setTwin] = useState('');
  const loaded = useVisualisation(viz, DIRECTORY, twin);
  if (error) {
    return (
      <Alert severity="error">The digital twins could not be listed.</Alert>
    );
  }
  return (
    <>
      <TwinPicker twins={twins} twin={twin} onChange={setTwin} />
      {twin && <Drawing loaded={loaded} />}
    </>
  );
}

export default VisualiseTab;
