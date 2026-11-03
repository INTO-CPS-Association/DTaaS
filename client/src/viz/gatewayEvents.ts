/**
 * The events of a signals gateway stream, and what each one does.
 *
 * `state` is the gateway's own connection to the broker, `sample` one broker
 * message forwarded as the raw text the broker carried, and `refused` the
 * paths the signed-in user may not read. Anything else, or data that is not
 * JSON, is skipped, so a newer gateway can add events.
 */

import {
  CHANNELS,
  type Channel,
  type ConnectionState,
  type SignalSink,
} from '@into-cps-association/dtaas-sdk';
import { sampleFrom } from 'viz/payload';
import type { SseEvent } from 'viz/sseStream';

/** Where the events of one stream go. */
export interface StreamTarget {
  sinksOf(path: string): ReadonlySet<SignalSink>;
  setState(state: ConnectionState): void;
  /** Called for a refused path, so a reconnect does not ask for it again. */
  refuse(path: string): void;
  /** The channel of a sample whose message names none. */
  readonly channel: Channel;
}

const STATES: ReadonlySet<unknown> = new Set(['connecting', 'live', 'down']);
const KNOWN_CHANNELS: ReadonlySet<unknown> = new Set(CHANNELS);

function parsed(data: string): Record<string, unknown> | undefined {
  try {
    const value: unknown = JSON.parse(data);
    return value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

/** When the gateway received a message, as a number or as ISO 8601 text. */
function receivedTime(value: unknown): number {
  const time = typeof value === 'string' ? Date.parse(value) : value;
  return typeof time === 'number' && Number.isFinite(time) ? time : Date.now();
}

/** Hand one forwarded broker message to the sinks of its path. */
function deliverSample(data: Record<string, unknown>, target: StreamTarget) {
  if (typeof data.path !== 'string' || typeof data.payload !== 'string') return;
  const channel = KNOWN_CHANNELS.has(data.channel)
    ? (data.channel as Channel)
    : target.channel;
  const receivedAt = receivedTime(data.receivedAt);
  const sample = sampleFrom(data.path, data.payload, channel, receivedAt);
  if (sample) target.sinksOf(data.path).forEach((sink) => sink(sample));
}

/** What each event of the stream does. */
export default function eventHandler(target: StreamTarget) {
  return (event: SseEvent) => {
    const data = parsed(event.data);
    if (!data) return;
    if (event.event === 'state' && STATES.has(data.state)) {
      target.setState(data.state as ConnectionState);
    } else if (event.event === 'sample') {
      deliverSample(data, target);
    } else if (event.event === 'refused' && Array.isArray(data.paths)) {
      data.paths.forEach((path) => target.refuse(String(path)));
    }
  };
}
