import { useSyncExternalStore } from 'react';
import worstConnectionState from '../host/connection';
import type {
  ConnectionState,
  ConnectionStatus,
} from '../host/visualisation.types';

export interface FakeConnection extends ConnectionStatus {
  /** Set `paths`, or every path (clearing overrides) when omitted. */
  set(state: ConnectionState, paths?: readonly string[]): void;
}

/** A tiny listener registry: subscribe to changes, notify everyone. */
const createListenerSet = () => {
  const listeners = new Set<() => void>();
  return {
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    notify: () => listeners.forEach((listener) => listener()),
  };
};

/** Connection state a test controls; every path starts `live`. */
const createFakeConnection = (): FakeConnection => {
  let fallback: ConnectionState = 'live';
  const byPath = new Map<string, ConnectionState>();
  const { subscribe, notify } = createListenerSet();
  const get = (paths?: readonly string[]) =>
    paths === undefined
      ? worstConnectionState([fallback, ...byPath.values()])
      : worstConnectionState(paths.map((p) => byPath.get(p) ?? fallback));
  const set = (state: ConnectionState, paths?: readonly string[]) => {
    if (paths === undefined) {
      fallback = state;
      byPath.clear();
    } else paths.forEach((path) => byPath.set(path, state));
    notify();
  };
  return {
    get,
    set,
    use: (paths) => useSyncExternalStore(subscribe, () => get(paths)),
  };
};

export default createFakeConnection;
