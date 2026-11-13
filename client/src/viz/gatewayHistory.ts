/**
 * Past samples of signals from the signals gateway, which reads them from the
 * time-series database on the server.
 *
 * The gateway may cut a long range short and say so with `truncated`, which
 * the answer keeps so the page can say that older readings are missing.
 */

import type { Channel, SignalSample } from '@into-cps-association/dtaas-sdk';
import { isSignalValue, qualityOf, unitOf } from 'viz/payload';
import {
  authorization,
  endpoint,
  UNAUTHORISED,
  type GatewaySettings,
} from 'viz/gateway';

/** The samples of a range, and whether the gateway left some out. */
export interface HistoryAnswer {
  readonly samples: SignalSample[];
  readonly truncated: boolean;
}

export interface SignalHistory {
  range(
    paths: readonly string[],
    channel: Channel,
    from: number,
    to: number,
  ): Promise<HistoryAnswer>;
}

/** One sample of the answer, or undefined when it is not one. */
function sampleOf(row: unknown, channel: Channel): SignalSample | undefined {
  if (!row || typeof row !== 'object') return undefined;
  const { path, ts, value, quality, unit } = row as Record<string, unknown>;
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
    unit: unitOf(unit),
  };
}

function answerOf(answer: unknown, channel: Channel): HistoryAnswer {
  const body = answer as { samples?: unknown; truncated?: unknown } | null;
  const rows = Array.isArray(body?.samples) ? body.samples : [];
  return {
    samples: rows.flatMap((row) => sampleOf(row, channel) ?? []),
    truncated: body?.truncated === true,
  };
}

export default function createGatewayHistory(
  settings: GatewaySettings,
): SignalHistory {
  const request = settings.fetch ?? ((url, init) => fetch(url, init));
  return {
    async range(paths, channel, from, to) {
      const token = settings.token();
      // A token the gateway refused is not sent again.
      if (settings.session?.isRefused(token)) {
        throw new Error('The signals gateway refused the sign-in');
      }
      const response = await request(endpoint(settings, 'range'), {
        method: 'POST',
        headers: {
          ...authorization(settings),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paths, channel, from, to }),
      });
      if (response.status === UNAUTHORISED) settings.session?.refuse(token);
      if (!response.ok) {
        throw new Error(
          `The signals gateway refused a range with ${response.status}`,
        );
      }
      return answerOf(await response.json(), channel);
    },
  };
}
