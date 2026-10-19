/**
 * Named colour schemes an encoding can ask for, as evenly spaced stops.
 *
 * The names are the ones `visualisation.json` files use. A scheme the core
 * does not know falls back to `heat`, so a typo shows a colour and not
 * nothing, and the scheme list is the place to add one.
 */

export const SCHEMES: Readonly<Record<string, readonly string[]>> = {
  heat: ['#2c7bb6', '#abd9e9', '#ffffbf', '#fdae61', '#d7191c'],
  traffic: ['#1a9641', '#a6d96a', '#ffffbf', '#fdae61', '#d7191c'],
  viridis: ['#440154', '#3b528b', '#21918c', '#5ec962', '#fde725'],
  diverging: ['#2166ac', '#92c5de', '#f7f7f7', '#f4a582', '#b2182b'],
};

const channels = (hex: string) =>
  [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16));

const hexOf = (values: number[]) =>
  `#${values.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

/** Where `value` sits in `[min, max]`, from 0 to 1, clamped. */
export function position(value: number, [min, max]: readonly number[]) {
  if (max === min) return 0;
  return Math.min(1, Math.max(0, (value - min) / (max - min)));
}

/** The colour at `t`, from 0 to 1, along a scheme. */
export function colourAt(scheme: string, t: number): string {
  const stops = SCHEMES[scheme] ?? SCHEMES.heat;
  const scaled = t * (stops.length - 1);
  const index = Math.min(stops.length - 2, Math.floor(scaled));
  const [from, to] = [channels(stops[index]), channels(stops[index + 1])];
  const fraction = scaled - index;
  return hexOf(from.map((value, i) => value + (to[i] - value) * fraction));
}
