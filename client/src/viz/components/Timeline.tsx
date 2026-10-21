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
import { HOUR_MS, isLive } from 'viz/time';

/** The slider moves a second at a time, and a minute with Shift or Page keys. */
const STEP_MS = 1000;
const SHIFT_STEP_MS = 60_000;

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

/** A playhead time as a person reads it, in the browser's own time zone. */
export const localTime = (t: number) => new Date(t).toLocaleTimeString();

/** The time on show, and whether its signals are arriving. */
function Clock({ signals, paths }: TimelineProps) {
  const t = signals.playhead.use();
  const connection = signals.connection.use(paths);
  return (
    <>
      <Typography variant="body2" sx={{ minWidth: '8rem' }}>
        {localTime(t)}
      </Typography>
      <Chip
        label={CONNECTION_LABEL[connection]}
        color={connection === 'live' ? 'success' : 'default'}
      />
    </>
  );
}

interface TimeSliderProps {
  readonly signals: SignalsService;
  readonly t: number;
  readonly now: number;
}

/** The last hour, a second a step, with the local time read aloud. */
function TimeSlider({ signals, t, now }: TimeSliderProps) {
  return (
    <Slider
      aria-label="Time"
      min={now - HOUR_MS}
      max={now}
      step={STEP_MS}
      shiftStep={SHIFT_STEP_MS}
      value={Math.max(t, now - HOUR_MS)}
      getAriaValueText={localTime}
      valueLabelFormat={localTime}
      valueLabelDisplay="auto"
      onChange={(_, value) => signals.playhead.set(value)}
    />
  );
}

function Timeline({ signals, paths }: TimelineProps) {
  const t = signals.playhead.use();
  const now = useNow();
  const live = isLive(t, now);
  // On a phone the slider takes a row of its own, so it stays wide enough.
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      sx={{ alignItems: { xs: 'stretch', sm: 'center' }, my: 2 }}
    >
      <Button
        variant={live ? 'contained' : 'outlined'}
        onClick={() => signals.playhead.follow(true)}
      >
        Live
      </Button>
      <TimeSlider signals={signals} t={t} now={now} />
      <Clock signals={signals} paths={paths} />
    </Stack>
  );
}

export default Timeline;
