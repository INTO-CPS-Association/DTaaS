/**
 * Past samples of signals from the signals gateway, which reads them from the
 * time-series database on the server.
 *
 * The gateway may cut a long range short and say so with `truncated`. The
 * SDK's `range` returns samples alone, so a cut range reads as the samples
 * it holds.
 */

import type { Channel, SignalSample } from '@into-cps-association/dtaas-sdk';
import { isSignalValue, qualityOf } from 'viz/payload';
import { authorization, endpoint, type GatewaySettings } from 'viz/gateway';

export interface SignalHistory {
  range(
    paths: readonly string[],
    channel: Channel,
    from: number,
    to: number,
  ): Promise<SignalSample[]>;
}

/** One sample of the answer, or undefined when it is not one. */
function sampleOf(row: unknown, channel: Channel): SignalSample | undefined {
  if (!row || typeof row !== 'object') return undefined;
  const { path, ts, value, quality } = row as Record<string, unknown>;
  if (typeof path !== 'string' || typeof ts !== 'number') return undefined;
  if (!Number.isFinite(ts) || !isSignalValue(value)) return undefined;
  // The channel asked for, since the store keys samples by it.
  return {
    twinId: '',
    signalPath: path,
    channel,
    ts,
    value,
    quality: qualityOf(quality),
  };
}

function samplesOf(answer: unknown, channel: Channel): SignalSample[] {
  const rows = (answer as { samples?: unknown } | null)?.samples;
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((row) => sampleOf(row, channel) ?? []);
}

export default function createGatewayHistory(
  settings: GatewaySettings,
): SignalHistory {
  const request = settings.fetch ?? ((url, init) => fetch(url, init));
  return {
    async range(paths, channel, from, to) {
      const response = await request(endpoint(settings, 'range'), {
        method: 'POST',
        headers: {
          ...authorization(settings),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paths, channel, from, to }),
      });
      if (!response.ok) {
        throw new Error(
          `The signals gateway refused a range with ${response.status}`,
        );
      }
      return samplesOf(await response.json(), channel);
    },
  };
}
