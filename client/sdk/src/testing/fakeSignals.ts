import type {
  ConnectionState,
  SignalsService,
} from '../host/visualisation.types';
import type { TbEntity } from '../visualisation/digitalTwin.types';
import type {
  Channel,
  Sampled,
  SignalSample,
  SignalSink,
} from '../visualisation/signal.types';
import createFakeConnection, { type FakeConnection } from './fakeConnection';
import createFakePlayhead, { type FakePlayhead } from './fakePlayhead';

export interface FakeSignalsOptions {
  /** Clock used while the playhead is live. Defaults to `Date.now`. */
  readonly now?: () => number;
  readonly entities?: readonly TbEntity[];
}

export interface FakeSignals extends SignalsService {
  readonly playhead: FakePlayhead;
  readonly connection: FakeConnection;
  /** Store samples and deliver them to matching subscribers. */
  emit(...samples: SignalSample[]): void;
  /** Every sample emitted so far, in emission order. */
  samples(): SignalSample[];
  /** Set the connection state of all paths, or `paths` only, when given. */
  setConnection(state: ConnectionState, paths?: readonly string[]): void;
}

interface Subscription {
  readonly paths: ReadonlySet<string>;
  readonly channel: Channel;
  readonly sink: SignalSink;
}

const toSampled = ({ value, ts, quality }: SignalSample): Sampled =>
  quality === undefined ? { value, ts } : { value, ts, quality };

const latestAtOrBefore = (samples: SignalSample[], t: number) =>
  samples
    .filter((s) => s.ts <= t)
    .reduce<SignalSample | undefined>(
      (best, s) => (best === undefined || s.ts >= best.ts ? s : best),
      undefined,
    );

const createRegistry = (entities: readonly TbEntity[]) => ({
  search: async (query: string) =>
    entities.filter((e) =>
      `${e.name} ${e.label ?? ''}`.toLowerCase().includes(query.toLowerCase()),
    ),
  get: async (id: string) => {
    const entity = entities.find((e) => e.id === id);
    if (!entity) throw new Error(`No such entity: ${id}`);
    return entity;
  },
});

/** Samples in emission order, queried by path, channel and time. */
const createSampleStore = () => {
  const all: SignalSample[] = [];
  const matching = (paths: readonly string[], channel: Channel) =>
    all.filter((s) => s.channel === channel && paths.includes(s.signalPath));
  return {
    all,
    at: (path: string, channel: Channel, t: number) => {
      const found = latestAtOrBefore(matching([path], channel), t);
      return found && toSampled(found);
    },
    between: (paths: string[], channel: Channel, from: number, to: number) =>
      matching(paths, channel)
        .filter((s) => s.ts >= from && s.ts <= to)
        .sort((a, b) => a.ts - b.ts),
  };
};

const createSubscriptions = () => {
  const subscriptions = new Set<Subscription>();
  return {
    add: (paths: string[], channel: Channel, sink: SignalSink) => {
      const subscription = { paths: new Set(paths), channel, sink };
      subscriptions.add(subscription);
      return () => {
        subscriptions.delete(subscription);
      };
    },
    deliver: (sample: SignalSample) =>
      subscriptions.forEach(({ paths, channel, sink }) => {
        if (channel === sample.channel && paths.has(sample.signalPath)) {
          sink(sample);
        }
      }),
  };
};

/** An in-memory temporal store: what the common core provides to kits. */
const createFakeSignals = (options: FakeSignalsOptions = {}): FakeSignals => {
  const store = createSampleStore();
  const subscriptions = createSubscriptions();
  const playhead = createFakePlayhead(options.now ?? Date.now);
  const connection = createFakeConnection();
  return {
    playhead,
    connection,
    setConnection: connection.set,
    registry: createRegistry(options.entities ?? []),
    samples: () => [...store.all],
    emit: (...samples) => {
      store.all.push(...samples);
      samples.forEach(subscriptions.deliver);
      playhead.notify();
    },
    subscribe: subscriptions.add,
    valueAt: (path, channel, t = playhead.get()) => store.at(path, channel, t),
    range: async (...args) => store.between(...args),
  };
};

export default createFakeSignals;
