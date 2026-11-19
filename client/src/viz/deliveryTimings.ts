/**
 * The three times of the last live samples, kept so a delivery measurement
 * can compare them: `ts`, when the source says it measured the value,
 * `receivedAt`, when the gateway took the message from the broker, and
 * `arrivedAt`, when the client read the event.
 *
 * Only the last `CAPACITY` samples are kept, in arrays written in place, so
 * keeping them costs a few writes per sample and no memory growth.
 */

export interface DeliveryTiming {
  readonly path: string;
  readonly ts: number;
  readonly receivedAt: number;
  readonly arrivedAt: number;
}

export const CAPACITY = 1024;

const paths: string[] = new Array<string>(CAPACITY);
const times = new Float64Array(CAPACITY * 3);
let next = 0;
let count = 0;

export function recordDelivery(timing: DeliveryTiming): void {
  paths[next] = timing.path;
  times[next * 3] = timing.ts;
  times[next * 3 + 1] = timing.receivedAt;
  times[next * 3 + 2] = timing.arrivedAt;
  next = (next + 1) % CAPACITY;
  count = Math.min(count + 1, CAPACITY);
}

/** The kept timings, oldest first. */
export function deliveryTimings(): DeliveryTiming[] {
  const first = (next - count + CAPACITY) % CAPACITY;
  return Array.from({ length: count }, (_, i) => {
    const at = (first + i) % CAPACITY;
    return {
      path: paths[at],
      ts: times[at * 3],
      receivedAt: times[at * 3 + 1],
      arrivedAt: times[at * 3 + 2],
    };
  });
}

/** Forget every kept timing, so a measurement starts from none. */
export function clearDeliveryTimings(): void {
  next = 0;
  count = 0;
}
