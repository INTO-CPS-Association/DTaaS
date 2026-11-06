/**
 * Reads the past of signals from the signals gateway into the store, only
 * for the stretches the store does not hold and no running read asks for,
 * so each instant is requested at most once. It says whether the gateway
 * cut an answer short.
 */

import { useSyncExternalStore } from 'react';
import type { Channel } from '@into-cps-association/dtaas-sdk';
import type { SignalHistory } from 'viz/gatewayHistory';
import {
  subtract,
  type HistoryCoverage,
  type Interval,
} from 'viz/historyCoverage';
import type { SampleStore } from 'viz/sampleStore';

/** The longest stretch the gateway answers in one range. */
export const MAX_SPAN_MS = 7 * 24 * 3_600_000;

export const coverageKey = (path: string, channel: Channel) =>
  `${channel} ${path}`;

export interface HistoryState {
  /** Whether the last answer of the gateway left samples out. */
  truncated(): boolean;
  /** React hook form of `truncated`. */
  useTruncated(): boolean;
}

export interface HistoryLoader extends HistoryState {
  load(
    paths: readonly string[],
    channel: Channel,
    from: number,
    to: number,
  ): Promise<void>;
}

/** A read of the gateway that has not answered yet, for one key. */
interface Running {
  readonly key: string;
  readonly stretch: Interval;
  readonly done: Promise<boolean>;
}

/** The parts of a window one key still needs, past what is held or asked. */
function missing(
  coverage: HistoryCoverage,
  running: ReadonlySet<Running>,
  key: string,
  [from, to]: Interval,
): Interval[] {
  const asked = [...running].filter((r) => r.key === key).map((r) => r.stretch);
  return subtract(coverage.gaps(key, from, to), asked);
}

/** The paths that share each missing stretch, so one request serves them. */
function requestsFor(
  find: (key: string) => Interval[],
  paths: readonly string[],
  channel: Channel,
) {
  const requests = new Map<string, { gap: Interval; paths: string[] }>();
  paths.forEach((path) =>
    find(coverageKey(path, channel)).forEach((gap) => {
      const request = requests.get(gap.join()) ?? { gap, paths: [] };
      request.paths.push(path);
      requests.set(gap.join(), request);
    }),
  );
  return [...requests.values()];
}

/** The running reads of these keys that overlap a window. */
function overlapping(
  running: ReadonlySet<Running>,
  keys: ReadonlySet<string>,
  [from, to]: Interval,
) {
  return [...running].filter(
    (r) => keys.has(r.key) && r.stretch[0] < to && r.stretch[1] > from,
  );
}

function truncation() {
  let truncated = false;
  const listeners = new Set<() => void>();
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  return {
    get: () => truncated,
    set: (value: boolean) => {
      if (value === truncated) return;
      truncated = value;
      listeners.forEach((listener) => listener());
    },
    use: () => useSyncExternalStore(subscribe, () => truncated),
  };
}

export default function createHistoryLoader(
  history: SignalHistory,
  store: SampleStore,
  coverage: HistoryCoverage,
): HistoryLoader {
  const cut = truncation();
  const running = new Set<Running>();
  const read = async (
    paths: string[],
    channel: Channel,
    [from, to]: Interval,
  ) => {
    const answer = await history.range(paths, channel, from, to);
    answer.samples.forEach((sample) => store.insert(sample));
    // Held only once read, so a failed read is asked again later.
    paths.forEach((p) => coverage.add(coverageKey(p, channel), from, to));
    return answer.truncated;
  };
  const start = (paths: string[], channel: Channel, gap: Interval) => {
    const done = read(paths, channel, gap);
    const entries = paths.map((p) => ({
      key: coverageKey(p, channel),
      stretch: gap,
      done,
    }));
    entries.forEach((entry) => running.add(entry));
    const finish = () => entries.forEach((entry) => running.delete(entry));
    done.then(finish, finish);
    return done;
  };
  return {
    async load(paths, channel, from, to) {
      const window: Interval = [Math.max(from, to - MAX_SPAN_MS), to];
      const keys = new Set(paths.map((p) => coverageKey(p, channel)));
      // Reads already asking for part of this window are waited for.
      const earlier = overlapping(running, keys, window).map((r) => r.done);
      const find = (key: string) => missing(coverage, running, key, window);
      const requests = requestsFor(find, paths, channel);
      const cuts = await Promise.all(
        requests.map(({ gap, paths: p }) => start(p, channel, gap)),
      );
      // Their failures belong to the callers that started them.
      await Promise.all(earlier.map((done) => done.catch(() => false)));
      if (requests.length > 0) cut.set(window[0] > from || cuts.some(Boolean));
    },
    truncated: cut.get,
    useTruncated: cut.use,
  };
}
