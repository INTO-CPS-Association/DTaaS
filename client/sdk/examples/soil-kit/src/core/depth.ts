/**
 * The reference of a `soil-depth` anchor: a profile and a depth range in
 * metres below the surface, such as `P03/0.20-0.40`. The two depths are the
 * upper and lower depths of the INSPIRE soil profile element, the same
 * values the kit's `soil_sensor` table holds as `depth_from` and `depth_to`.
 */

import { TOPIC_LEVEL } from './topic';

export interface DepthRange {
  readonly profile: string;
  /** Upper depth, in metres below the surface. */
  readonly from: number;
  /** Lower depth, in metres below the surface. */
  readonly to: number;
}

const DEPTHS = /^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/;

/** `P03/0.20-0.40` to its profile and depths, or `undefined` when invalid. */
export function parseDepthRef(ref: string): DepthRange | undefined {
  const slash = ref.indexOf('/');
  const profile = ref.slice(0, slash);
  const depths = DEPTHS.exec(ref.slice(slash + 1));
  if (slash < 0 || !TOPIC_LEVEL.test(profile) || !depths) return undefined;
  const [from, to] = [Number(depths[1]), Number(depths[2])];
  return to > from ? { profile, from, to } : undefined;
}

/** `0.20 to 0.40 m`, the depth range as a person reads it. */
export const formatDepth = ({ from, to }: DepthRange): string =>
  `${from.toFixed(2)} to ${to.toFixed(2)} m`;
