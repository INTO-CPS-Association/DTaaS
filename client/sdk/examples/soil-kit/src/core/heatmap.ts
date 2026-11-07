/**
 * The time by depth heatmap of one quantity: for each depth, the mean of the
 * readings in each equal stretch of a time window. A stretch without a
 * reading stays empty instead of being filled in, so a gap in the data shows.
 */

export interface TimedValue {
  readonly signalPath: string;
  readonly ts: number;
  readonly value: unknown;
}

export interface TimeWindow {
  readonly from: number;
  readonly to: number;
  readonly bins: number;
}

/** The bin of a time in the window, or -1 outside it. */
function binOf(ts: number, { from, to, bins }: TimeWindow): number {
  if (ts < from || ts > to || to <= from) return -1;
  return Math.min(bins - 1, Math.floor(((ts - from) / (to - from)) * bins));
}

/** The mean of each bin of one signal; `undefined` where a bin is empty. */
export function binMeans(
  samples: readonly TimedValue[],
  window: TimeWindow,
): (number | undefined)[] {
  const sums = new Array<number>(window.bins).fill(0);
  const counts = new Array<number>(window.bins).fill(0);
  samples.forEach(({ ts, value }) => {
    const bin = binOf(ts, window);
    if (bin < 0 || typeof value !== 'number' || !Number.isFinite(value)) return;
    sums[bin] += value;
    counts[bin] += 1;
  });
  return sums.map((sum, bin) =>
    counts[bin] > 0 ? sum / counts[bin] : undefined,
  );
}

/** One row of bin means per signal path, in the order of `paths`. */
export const heatmapGrid = (
  samples: readonly TimedValue[],
  paths: readonly string[],
  window: TimeWindow,
): (number | undefined)[][] =>
  paths.map((path) =>
    binMeans(
      samples.filter((sample) => sample.signalPath === path),
      window,
    ),
  );
