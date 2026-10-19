/**
 * The playhead as a person moves it: a slider over the last hour, a button
 * back to live, and whether the signals on screen are arriving.
 */

import { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { SignalsService } from '@into-cps-association/dtaas-sdk';

const WINDOW_MS = 3_600_000;

const LIVE_SLACK_MS = 2000;

const CONNECTION_LABEL = {
  live: 'Live data',
  connecting: 'Connecting',
  down: 'No live data',
} as const;

interface TimelineProps {
  readonly signals: SignalsService;
  readonly paths: readonly string[];
}

/** The wall clock, read once a second, for the end of the slider. */
function useNow(): number {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

/** The time on show, and whether its signals are arriving. */
function Clock({ signals, paths }: TimelineProps) {
  const t = signals.playhead.use();
  const connection = signals.connection.use(paths);
  return (
    <>
      <Typography variant="body2" sx={{ minWidth: '8rem' }}>
        {new Date(t).toLocaleTimeString()}
      </Typography>
      <Chip
        label={CONNECTION_LABEL[connection]}
        color={connection === 'live' ? 'success' : 'default'}
      />
    </>
  );
}

function Timeline({ signals, paths }: TimelineProps) {
  const t = signals.playhead.use();
  const now = useNow();
  const live = now - t <= LIVE_SLACK_MS;
  return (
    <Stack direction="row" spacing={2} sx={{ alignItems: 'center', my: 2 }}>
      <Button
        variant={live ? 'contained' : 'outlined'}
        onClick={() => signals.playhead.follow(true)}
      >
        Live
      </Button>
      <Slider
        aria-label="Time"
        min={now - WINDOW_MS}
        max={now}
        value={Math.max(t, now - WINDOW_MS)}
        onChange={(_, value) => signals.playhead.set(value)}
      />
      <Clock signals={signals} paths={paths} />
    </Stack>
  );
}

export default Timeline;
