/**
 * Whether the transports behind some signals are delivering.
 *
 * Every live transport here serves any path it is asked for (an MQTT topic is
 * a path), so the state of a set of paths is the worst state of all
 * transports. With no transport configured nothing can deliver, so every
 * path is `down`. Asking about no paths at all is `live`, as the SDK states.
 */

import { useSyncExternalStore } from 'react';
import {
  worstConnectionState,
  type ConnectionState,
  type ConnectionStatus,
} from '@into-cps-association/dtaas-sdk';
import type { LiveTransport } from 'viz/mqttTransport';

export default function connectionOf(
  transports: readonly LiveTransport[],
): ConnectionStatus {
  const get = (paths?: readonly string[]): ConnectionState => {
    if (paths?.length === 0) return 'live';
    if (transports.length === 0) return 'down';
    return worstConnectionState(transports.map((t) => t.state()));
  };
  const subscribe = (listener: () => void) => {
    const stops = transports.map((t) => t.onState(listener));
    return () => stops.forEach((stop) => stop());
  };
  return {
    get,
    use: (paths) => useSyncExternalStore(subscribe, () => get(paths)),
  };
}
