/**
 * The signals service of the common core (layers 1 and 2).
 *
 * Transports deliver samples, each sample is stored once in the temporal
 * store, and every subscriber of its path and channel is told. A path is
 * subscribed on the transports while at least one subscriber wants it, so
 * two pages showing the same sensor cost one broker subscription.
 *
 * With a history configured, a range first reads into the store the
 * stretches it does not hold yet, and then reads the store, so the past and
 * the samples that arrived live come back as one series in time order, each
 * instant once. A stretch is read once: while a path is subscribed, the live
 * samples cover it from the moment of the subscription.
 */

import {
  CHANNELS,
  type Channel,
  type SignalSample,
  type SignalSink,
  type SignalsService,
} from '@into-cps-association/dtaas-sdk';
import createSampleStore, { type SampleStore } from 'viz/sampleStore';
import createPlayhead from 'viz/playhead';
import connectionOf from 'viz/connection';
import type { LiveTransport } from 'viz/transport';
import type { SignalHistory } from 'viz/gatewayHistory';
import createHistoryCoverage, {
  type HistoryCoverage,
} from 'viz/historyCoverage';
import createHistoryLoader, {
  coverageKey,
  type HistoryState,
} from 'viz/historyLoader';

/** The signals service of this core, with the state of its history. */
export interface CoreSignals extends SignalsService {
  readonly history: HistoryState;
}

const NO_HISTORY: HistoryState = {
  truncated: () => false,
  useTruncated: () => false,
};

/** The history state of a signals service, or none when it is not this core's. */
export function historyOf(signals: SignalsService): HistoryState {
  return (signals as Partial<CoreSignals>).history ?? NO_HISTORY;
}

/** Mark or end the live stretch of one path, on every channel. */
function liveCoverage(coverage: HistoryCoverage, now: () => number) {
  return {
    open: (path: string) =>
      CHANNELS.forEach((c) =>
        coverage.add(coverageKey(path, c), now(), Infinity),
      ),
    close: (path: string) =>
      CHANNELS.forEach((c) => coverage.close(coverageKey(path, c), now())),
  };
}

interface Listener {
  readonly channel: Channel;
  readonly sink: SignalSink;
}

/** Store a sample and hand it to the listeners of its path and channel. */
function deliver(store: SampleStore, listeners: Map<string, Set<Listener>>) {
  return (sample: SignalSample) => {
    store.insert(sample);
    listeners.get(sample.signalPath)?.forEach((listener) => {
      if (listener.channel === sample.channel) listener.sink(sample);
    });
  };
}

function fanOut(
  store: SampleStore,
  transports: readonly LiveTransport[],
  live: ReturnType<typeof liveCoverage>,
) {
  const listeners = new Map<string, Set<Listener>>();
  const stops = new Map<string, () => void>();
  const received = deliver(store, listeners);
  const add = (path: string, listener: Listener) => {
    const set = listeners.get(path) ?? new Set<Listener>();
    listeners.set(path, set.add(listener));
    if (!stops.has(path)) {
      live.open(path);
      const offs = transports.map((t) => t.subscribe([path], received));
      stops.set(path, () => offs.forEach((off) => off()));
    }
  };
  const remove = (path: string, listener: Listener) => {
    const set = listeners.get(path);
    set?.delete(listener);
    if (set?.size === 0) {
      stops.get(path)?.();
      stops.delete(path);
      live.close(path);
    }
  };
  return { add, remove };
}

// The device registry is ThingsBoard's, which this core does not read yet.
const NO_REGISTRY: SignalsService['registry'] = {
  search: () => Promise.resolve([]),
  get: (id) =>
    Promise.reject(
      new Error(`Device ${id}: the device registry is not connected`),
    ),
};

/** Fill the store from the history where it has gaps, then read the store. */
function ranger(
  store: SampleStore,
  coverage: HistoryCoverage,
  history?: SignalHistory,
) {
  const loader = history && createHistoryLoader(history, store, coverage);
  const range: SignalsService['range'] = async (paths, channel, from, to) => {
    await loader?.load(paths, channel, from, to);
    return paths.flatMap((path) => store.range(path, channel, from, to));
  };
  return { range, state: loader ?? NO_HISTORY };
}

export default function createSignals(
  transports: readonly LiveTransport[],
  store: SampleStore = createSampleStore(),
  history?: SignalHistory,
  now: () => number = Date.now,
): CoreSignals {
  const playhead = createPlayhead(now);
  const coverage = createHistoryCoverage();
  const fan = fanOut(store, transports, liveCoverage(coverage, now));
  const past = ranger(store, coverage, history);
  return {
    subscribe(paths, channel, sink) {
      const listener = { channel, sink };
      paths.forEach((path) => fan.add(path, listener));
      return () => paths.forEach((path) => fan.remove(path, listener));
    },
    valueAt: (path, channel, t = playhead.get()) =>
      store.valueAt(path, channel, t),
    range: past.range,
    history: past.state,
    playhead,
    registry: NO_REGISTRY,
    connection: connectionOf(transports),
  };
}
