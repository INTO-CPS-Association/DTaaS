/**
 * The one clock every substrate, embedded panel and table reads (T10).
 *
 * In live mode the playhead is now, and a page that shows it re-renders once
 * a second. Setting a time leaves live mode, which is how a person scrubs back
 * through what happened.
 */

import { useSyncExternalStore } from 'react';
import type { Playhead } from '@into-cps-association/dtaas-sdk';

const LIVE_TICK_MS = 1000;

/** A subscription that also wakes its listener every live tick. */
function ticking(listeners: Set<() => void>, tick: () => boolean) {
  return (listener: () => void) => {
    listeners.add(listener);
    const timer = setInterval(() => {
      if (tick()) listener();
    }, LIVE_TICK_MS);
    return () => {
      clearInterval(timer);
      listeners.delete(listener);
    };
  };
}

export default function createPlayhead(now: () => number = Date.now): Playhead {
  let live = true;
  let time = now();
  const listeners = new Set<() => void>();
  const get = () => (live ? now() : time);

  // A snapshot that changes only when a listener should re-render: each tick
  // in live mode, each set when scrubbing.
  let snapshot = get();
  const subscribe = ticking(listeners, () => {
    if (live) snapshot = now();
    return live;
  });
  const moveTo = (following: boolean, t: number) => {
    live = following;
    time = t;
    snapshot = t;
    listeners.forEach((listener) => listener());
  };

  return {
    get,
    set: (t) => moveTo(false, t),
    follow: (follow) => moveTo(follow, now()),
    use: () => useSyncExternalStore(subscribe, () => snapshot),
  };
}
