/**
 * Which stretches of time the store already holds for each signal and
 * channel, so a stretch is read from the signals gateway once.
 *
 * A stretch is covered when its history was read, or while the signal is
 * subscribed live, from the moment of the subscription. An open stretch ends
 * at `Infinity` until the subscription stops.
 */

export type Interval = [number, number];

export interface HistoryCoverage {
  /** The parts of `[from, to]` the store does not hold yet, in time order. */
  gaps(key: string, from: number, to: number): Interval[];
  add(key: string, from: number, to: number): void;
  /** End the open stretch of a key, when its live subscription stops. */
  close(key: string, at: number): void;
}

/** Sorted intervals with every overlap or touch merged into one. */
function merged(intervals: Interval[]): Interval[] {
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  return sorted.reduce<Interval[]>((out, [from, to]) => {
    const last = out[out.length - 1];
    if (last && from <= last[1]) last[1] = Math.max(last[1], to);
    else out.push([from, to]);
    return out;
  }, []);
}

function gapsIn(covered: readonly Interval[], from: number, to: number) {
  const gaps: Interval[] = [];
  let start = from;
  covered.forEach(([a, b]) => {
    if (b < start || a > to) return;
    if (a > start) gaps.push([start, a]);
    start = Math.max(start, b);
  });
  if (start < to) gaps.push([start, to]);
  return gaps;
}

/** The parts of `gaps` that none of `taken` overlaps. */
export function subtract(
  gaps: readonly Interval[],
  taken: readonly Interval[],
): Interval[] {
  const blocked = merged([...taken]);
  return gaps.flatMap(([from, to]) => gapsIn(blocked, from, to));
}

export default function createHistoryCoverage(): HistoryCoverage {
  const covered = new Map<string, Interval[]>();
  const of = (key: string) => covered.get(key) ?? [];
  return {
    gaps: (key, from, to) => gapsIn(of(key), from, to),
    add: (key, from, to) => covered.set(key, merged([...of(key), [from, to]])),
    close: (key, at) =>
      covered.set(
        key,
        of(key).map(([a, b]): Interval => [a, b === Infinity ? at : b]),
      ),
  };
}
