/**
 * What a stream remembers for the next one: the id of the last event the
 * gateway sent, which goes back as `Last-Event-ID` so the gateway fills the
 * gap from its history, and whether the stream ended on purpose.
 *
 * The gateway ends a stream at its age with an `end` event. That end is
 * planned, so the next stream opens at once and not after the wait that
 * follows a failure.
 */

import type { SseEvent } from 'viz/sseStream';

export interface StreamResume {
  /** A handler that notes each event's id and planned end, then hands it on. */
  watching(handle: (event: SseEvent) => void): (event: SseEvent) => void;
  /** The header that names the last event received, when there is one. */
  headers(): Record<string, string>;
  /** Whether the stream that just ended said it would end, then forget it. */
  takePlannedEnd(): boolean;
}

export default function createStreamResume(): StreamResume {
  let lastId: string | undefined;
  let plannedEnd = false;
  return {
    watching: (handle) => (event) => {
      if (event.id !== undefined) lastId = event.id;
      if (event.event === 'end') plannedEnd = true;
      handle(event);
    },
    headers(): Record<string, string> {
      return lastId === undefined ? {} : { 'Last-Event-ID': lastId };
    },
    takePlannedEnd() {
      const planned = plannedEnd;
      plannedEnd = false;
      return planned;
    },
  };
}
