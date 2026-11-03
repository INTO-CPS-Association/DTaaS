/**
 * Where an image anchor sits on a photograph, in the picture's own pixels.
 *
 * The SDK leaves the form of an image anchor's `ref` to the substrate, so it
 * is fixed here and in the README:
 *
 * - `image-point`: one point, `"x,y"`.
 * - `image-region`: a polygon, its corners as in SVG, `"x1,y1 x2,y2 x3,y3"`.
 *
 * With a `homographyId`, the coordinates are in the world units of that
 * calibration, metres on a road for instance, and the calibration maps them
 * onto the picture. Without one, they are pixels of the picture.
 */

import type {
  Anchor,
  SubstrateDescriptor,
} from '@into-cps-association/dtaas-sdk';
import fitHomography, { type Point } from 'viz/substrates/homography';

export function parsePoints(ref: string): Point[] {
  return ref
    .trim()
    .split(/\s+/)
    .map((pair) => {
      const [x, y] = pair.split(',').map(Number);
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        throw new TypeError(`${ref} is not a list of x,y points`);
      }
      return [x, y] as const;
    });
}

/** The world-to-picture map of a calibration, or the identity without one. */
export function pictureMap(
  anchor: Anchor,
  descriptor: SubstrateDescriptor,
): (point: Point) => Point {
  const { calibration } = descriptor;
  if (!anchor.homographyId) return (point) => point;
  if (calibration?.id !== anchor.homographyId) {
    throw new Error(`No calibration ${anchor.homographyId} on this picture`);
  }
  return fitHomography(calibration.worldPoints, calibration.imagePoints);
}

/** The anchor's points on the picture, or undefined for another kind. */
export function anchorPixels(
  anchor: Anchor,
  descriptor: SubstrateDescriptor,
): Point[] | undefined {
  if (anchor.kind !== 'image-point' && anchor.kind !== 'image-region') {
    return undefined;
  }
  const points = parsePoints(anchor.ref);
  const wanted = anchor.kind === 'image-point' ? 1 : 3;
  if (points.length < wanted) {
    throw new Error(`${anchor.kind} ${anchor.ref} needs ${wanted} point(s)`);
  }
  return points.map(pictureMap(anchor, descriptor));
}
