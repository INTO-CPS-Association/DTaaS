/**
 * The signals service of the common core (layers 1 and 2).
 *
 * Transports deliver samples, each sample is stored once in the temporal
 * store, and every subscriber of its path and channel is told. A path is
 * subscribed on the transports while at least one subscriber wants it, so
 * two pages showing the same sensor cost one broker subscription.
 */

import type {
  Channel,
  SignalSample,
  SignalSink,
  SignalsService,
} from '@into-cps-association/dtaas-sdk';
import createSampleStore, { type SampleStore } from 'viz/sampleStore';
import createPlayhead from 'viz/playhead';
import connectionOf from 'viz/connection';
import type { LiveTransport } from 'viz/mqttTransport';

interface Listener {
  readonly channel: Channel;
  readonly sink: SignalSink;
}

export interface CoreSignals extends SignalsService {
  /** Store recorded samples, such as a replayed file or a history query. */
  ingest(samples: readonly SignalSample[]): void;
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

function fanOut(store: SampleStore, transports: readonly LiveTransport[]) {
  const listeners = new Map<string, Set<Listener>>();
  const stops = new Map<string, () => void>();
  const received = deliver(store, listeners);
  const add = (path: string, listener: Listener) => {
    const set = listeners.get(path) ?? new Set<Listener>();
    listeners.set(path, set.add(listener));
    if (!stops.has(path)) {
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
    }
  };
  return { add, remove };
}

export default function createSignals(
  transports: readonly LiveTransport[],
  store: SampleStore = createSampleStore(),
): CoreSignals {
  const playhead = createPlayhead();
  const fan = fanOut(store, transports);
  return {
    subscribe(paths, channel, sink) {
      const listener = { channel, sink };
      paths.forEach((path) => fan.add(path, listener));
      return () => paths.forEach((path) => fan.remove(path, listener));
    },
    valueAt: (path, channel, t = playhead.get()) =>
      store.valueAt(path, channel, t),
    range: async (paths, channel, from, to) =>
      paths.flatMap((path) => store.range(path, channel, from, to)),
    ingest: (samples) => samples.forEach((sample) => store.insert(sample)),
    playhead,
    // The device registry is ThingsBoard's, which this core does not read yet.
    registry: {
      search: async () => [],
      get: async (id) => {
        throw new Error(`Device ${id}: the device registry is not connected`);
      },
    },
    connection: connectionOf(transports),
  };
}
