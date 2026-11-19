/**
 * Where each sensor label sits in depth from its marker on the plan: above
 * it, or below it when above would cover a label already placed, so
 * neighbouring sensors keep their labels apart.
 */

/** A label on the plan: its marker position and the label's size. */
export interface LabelSpot {
  readonly x: number;
  readonly z: number;
  readonly width: number;
  readonly height: number;
}

interface Area {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

function areaOf(spot: LabelSpot, dz: number): Area {
  const z = spot.z + dz;
  return {
    left: spot.x - spot.width / 2,
    right: spot.x + spot.width / 2,
    top: z - spot.height / 2,
    bottom: z + spot.height / 2,
  };
}

const overlap = (a: Area, b: Area) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

/** The depth offset of each label, in the order the spots are given. */
export function labelOffsets(spots: readonly LabelSpot[]): number[] {
  const placed: Area[] = [];
  return spots.map((spot) => {
    const sides = [-spot.height, spot.height];
    const dz =
      sides.find(
        (side) => !placed.some((area) => overlap(area, areaOf(spot, side))),
      ) ?? sides[0];
    placed.push(areaOf(spot, dz));
    return dz;
  });
}
