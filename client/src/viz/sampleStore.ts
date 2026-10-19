/**
 * The hot tier of the temporal store: recent samples of each signal, in time
 * order, so any part of the client can read a signal at any instant.
 *
 * The companion report names "latest value only" as the one decision that
 * cannot be retrofitted, so every sample is kept, up to a bound per signal,
 * and read by time. Samples may arrive out of order from a broker, so each is
 * inserted at its place instead of appended.
 */

import type {
  Channel,
  Sampled,
  SignalSample,
} from '@into-cps-association/dtaas-sdk';

/** How many samples of one signal and channel stay in memory. */
export const SAMPLES_PER_SIGNAL = 10_000;

const keyOf = (path: string, channel: Channel) => `${channel} ${path}`;

/** The index of the first sample later than `t`, by binary search. */
function firstAfter(samples: readonly SignalSample[], t: number): number {
  let low = 0;
  let high = samples.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (samples[middle].ts <= t) low = middle + 1;
    else high = middle;
  }
  return low;
}

export interface SampleStore {
  insert(sample: SignalSample): void;
  valueAt(path: string, channel: Channel, t: number): Sampled | undefined;
  range(
    path: string,
    channel: Channel,
    from: number,
    to: number,
  ): SignalSample[];
}

export default function createSampleStore(
  capacity = SAMPLES_PER_SIGNAL,
): SampleStore {
  const series = new Map<string, SignalSample[]>();
  return {
    insert(sample) {
      const key = keyOf(sample.signalPath, sample.channel);
      const samples = series.get(key) ?? [];
      samples.splice(firstAfter(samples, sample.ts), 0, sample);
      if (samples.length > capacity) samples.shift();
      series.set(key, samples);
    },
    valueAt(path, channel, t) {
      const samples = series.get(keyOf(path, channel)) ?? [];
      const latest = samples[firstAfter(samples, t) - 1];
      return (
        latest && {
          value: latest.value,
          ts: latest.ts,
          quality: latest.quality,
        }
      );
    },
    range(path, channel, from, to) {
      const samples = series.get(keyOf(path, channel)) ?? [];
      return samples.slice(
        firstAfter(samples, from - 1),
        firstAfter(samples, to),
      );
    },
  };
}
