import { useEffect, useReducer } from 'react';
import type { HostServices } from '@into-cps-association/dtaas-sdk';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Keep the readings of `paths` coming: subscribe to them, so the host
 * streams them. Read the day before the playhead, so a sensor shows its
 * last stored reading before a new one arrives. Returns a number that
 * changes with every reading, for the page to read the values again.
 */
export default function useReadings(
  host: HostServices,
  paths: readonly string[],
): number {
  const [version, bump] = useReducer((n: number) => n + 1, 0);
  // The list is rebuilt on every render, so the effect keys on its content.
  const key = paths.join('\n');
  useEffect(() => {
    const list = key === '' ? [] : key.split('\n');
    if (list.length === 0) return undefined;
    const { signals } = host;
    const unsubscribe = signals.subscribe(list, 'measured', bump);
    const now = signals.playhead.get();
    signals
      .range(list, 'measured', now - DAY_MS, now)
      .then(bump)
      .catch((error: Error) =>
        host.logger.warn('The stored soil readings were not read.', error),
      );
    return unsubscribe;
  }, [host, key]);
  return version;
}
