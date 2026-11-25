/**
 * The state a live transport keeps: the sinks of each path it streams, and
 * the state of its connection with the listeners told of each change.
 */

import type {
  ConnectionState,
  SignalSink,
} from '@into-cps-association/dtaas-extensions';

/** The sinks of each path, and whether a change altered the set of paths. */
export function pathBook() {
  const sinks = new Map<string, Set<SignalSink>>();
  // Every path gets the sink, so the loop must not stop at the first new one.
  const add = (paths: readonly string[], sink: SignalSink) => {
    let changed = false;
    paths.forEach((path) => {
      const set = sinks.get(path) ?? new Set<SignalSink>();
      sinks.set(path, set.add(sink));
      if (set.size === 1) changed = true;
    });
    return changed;
  };
  const remove = (paths: readonly string[], sink: SignalSink) =>
    paths.filter((path) => {
      const set = sinks.get(path);
      if (!set?.delete(sink) || set.size > 0) return false;
      return sinks.delete(path);
    });
  return {
    add,
    remove,
    paths: () => [...sinks.keys()],
    sinksOf: (path: string) => sinks.get(path) ?? new Set<SignalSink>(),
  };
}

export type PathBook = ReturnType<typeof pathBook>;

/** The state of a connection, and who to tell when it changes. */
export function stateCell() {
  let current: ConnectionState = 'connecting';
  const listeners = new Set<() => void>();
  return {
    get: () => current,
    set(next: ConnectionState) {
      if (next === current) return;
      current = next;
      listeners.forEach((listener) => listener());
    },
    on(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export type StateCell = ReturnType<typeof stateCell>;
