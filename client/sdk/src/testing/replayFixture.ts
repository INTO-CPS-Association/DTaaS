import type {
  Channel,
  Sampled,
  SignalSample,
} from '../visualisation/signal.types';
import type { FakeSignals } from './fakeSignals';

export interface ReplayOptions {
  /** Playhead increment in milliseconds. */
  readonly step: number;
  /** First frame; defaults to the earliest sample. */
  readonly from?: number;
  /** Last frame; defaults to the latest sample. */
  readonly to?: number;
  /** Paths to sample; defaults to every path in the stream. */
  readonly paths?: readonly string[];
  readonly channel?: Channel;
}

export interface ReplayFrame {
  readonly t: number;
  readonly values: Readonly<Record<string, Sampled | undefined>>;
}

const frameTimes = (from: number, to: number, step: number): number[] => {
  const times: number[] = [];
  for (let t = from; t <= to; t += step) times.push(t);
  return times;
};

/**
 * Replays a recorded stream through fake signals: before each frame, emits
 * the samples the playhead has reached, then reads every path at the
 * playhead. The core's fixture-replay test, runnable against a kit.
 */
const replayFixture = (
  host: { readonly signals: FakeSignals },
  samples: readonly SignalSample[],
  options: ReplayOptions,
): ReplayFrame[] => {
  if (!(options.step > 0)) throw new Error('step must be a positive number');
  if (samples.length === 0) return [];
  const pending = [...samples].sort((a, b) => a.ts - b.ts);
  const timestamps = pending.map((s) => s.ts);
  const paths = options.paths ?? [...new Set(pending.map((s) => s.signalPath))];
  const channel = options.channel ?? 'measured';
  const { from = timestamps[0], to = timestamps[timestamps.length - 1] } =
    options;
  return frameTimes(from, to, options.step).map((t) => {
    const reached = pending.findIndex((s) => s.ts > t);
    host.signals.emit(
      ...pending.splice(0, reached === -1 ? pending.length : reached),
    );
    host.signals.playhead.set(t);
    const values = Object.fromEntries(
      paths.map((path) => [path, host.signals.valueAt(path, channel, t)]),
    );
    return { t, values };
  });
};

export default replayFixture;
