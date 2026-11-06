/**
 * The one clock every substrate, embedded panel and table reads.
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

/** Whether the playhead follows now, where it stands, and who is watching. */
interface Clock {
  live: boolean;
  time: number;
  /** Changes only when a watcher should re-render. */
  snapshot: number;
  readonly listeners: Set<() => void>;
}

function moveTo(clock: Clock, following: boolean, t: number): void {
  clock.live = following;
  clock.time = t;
  clock.snapshot = t;
  clock.listeners.forEach((listener) => listener());
}

export default function createPlayhead(now: () => number = Date.now): Playhead {
  const start = now();
  const clock: Clock = {
    live: true,
    time: start,
    snapshot: start,
    listeners: new Set(),
  };
  // The snapshot moves each tick in live mode, and each set when scrubbing.
  const subscribe = ticking(clock.listeners, () => {
    if (clock.live) clock.snapshot = now();
    return clock.live;
  });
  return {
    get: () => (clock.live ? now() : clock.time),
    set: (t) => moveTo(clock, false, t),
    follow: (follow) => moveTo(clock, follow, now()),
    use: () => useSyncExternalStore(subscribe, () => clock.snapshot),
  };
}
