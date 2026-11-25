import { useSyncExternalStore } from 'react';
import type { Playhead } from '../host/visualisation.types';

export interface FakePlayhead extends Playhead {
  /** Re-renders `use()` consumers; called when live data arrives. */
  notify(): void;
}

/** A tiny external store for `useSyncExternalStore`. */
const createSnapshotStore = (read: () => number) => {
  let snapshot = read();
  const listeners = new Set<() => void>();
  return {
    snapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    notify: () => {
      snapshot = read();
      listeners.forEach((listener) => listener());
    },
  };
};

/** A playhead that is live (follows `now`) until a time is set. */
const createFakePlayhead = (now: () => number): FakePlayhead => {
  let live = true;
  let time = now();
  const get = () => (live ? now() : time);
  const store = createSnapshotStore(get);
  const change = (nextLive: boolean, nextTime: number) => {
    live = nextLive;
    time = nextTime;
    store.notify();
  };
  return {
    get,
    notify: store.notify,
    set: (t) => change(false, t),
    follow: (follow) => change(follow, get()),
    use: () => useSyncExternalStore(store.subscribe, store.snapshot),
  };
};

export default createFakePlayhead;
