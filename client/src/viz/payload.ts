/**
 * Turn one broker message into a `SignalSample`, the one shape every transport
 * normalises to (layer 1).
 *
 * Three payloads are understood, in the order they are tried:
 *
 * - JSON with a `value`, and optionally `ts` or `timestamp` and `quality`.
 * - A bare number, such as `21.4`.
 * - The comma-separated line of the DTaaS examples,
 *   `timestamp,measurement,type,unit,value`, as in
 *   `20261013T10:00:00,temperature,simulation,°C,21.40`. A `simulation` type
 *   is the `simulated` channel, so a simulated reading is never shown as a
 *   measured one.
 *
 * A message carries the time it was measured when it can, and the time it
 * arrived otherwise.
 */

import type {
  Channel,
  SignalSample,
  SignalValue,
} from '@into-cps-association/dtaas-sdk';

export interface Decoded {
  readonly value: SignalValue;
  readonly ts?: number;
  readonly channel?: Channel;
  readonly quality?: SignalSample['quality'];
}

/** `20261013T10:00:00`, local time as the publisher wrote it. */
function compactTime(text: string): number | undefined {
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2}):(\d{2}):(\d{2})$/.exec(text);
  if (!match) return undefined;
  const [year, month, day, hour, minute, second] = match.slice(1).map(Number);
  return new Date(year, month - 1, day, hour, minute, second).getTime();
}

function timeOf(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return undefined;
  const parsed = compactTime(value) ?? Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function fromJson(text: string): Decoded | undefined {
  try {
    const data = JSON.parse(text) as Record<string, unknown> | number;
    if (typeof data === 'number') return { value: data };
    if (data === null || typeof data !== 'object' || !('value' in data)) {
      return undefined;
    }
    return {
      value: data.value as SignalValue,
      ts: timeOf(data.ts ?? data.timestamp),
      quality: data.quality as Decoded['quality'],
    };
  } catch {
    return undefined;
  }
}

function fromLine(text: string): Decoded | undefined {
  const fields = text.split(',');
  if (fields.length !== 5) return undefined;
  const value = Number(fields[4]);
  if (!Number.isFinite(value)) return undefined;
  return {
    value,
    ts: timeOf(fields[0]),
    channel: fields[2].trim() === 'simulation' ? 'simulated' : undefined,
  };
}

/** The value and time in a payload, or undefined when it is not one. */
export function decodePayload(text: string): Decoded | undefined {
  return fromJson(text.trim()) ?? fromLine(text.trim());
}

/** A sample for `path` from a payload, or undefined when it is unreadable. */
export function sampleFrom(
  path: string,
  text: string,
  channel: Channel,
  now: number,
): SignalSample | undefined {
  const decoded = decodePayload(text);
  if (!decoded) return undefined;
  return {
    twinId: '',
    signalPath: path,
    channel: decoded.channel ?? channel,
    ts: decoded.ts ?? now,
    value: decoded.value,
    quality: decoded.quality,
  };
}
