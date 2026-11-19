import { labelOffsets } from 'src/aec/aecLabelPlacement';

const spot = (x: number, z: number, width = 4) => ({ x, z, width, height: 1 });

describe('labelOffsets', () => {
  it('puts labels that do not touch above their markers', () => {
    expect(labelOffsets([spot(0, 0), spot(10, 0)])).toEqual([-1, -1]);
  });

  it('moves a label below its marker when above would cover a neighbour', () => {
    expect(labelOffsets([spot(0, 0), spot(3, 0.5)])).toEqual([-1, 1]);
  });

  it('follows the width of each label', () => {
    expect(labelOffsets([spot(0, 0, 2), spot(3, 0, 2)])).toEqual([-1, -1]);
    expect(labelOffsets([spot(0, 0, 8), spot(3, 0, 2)])).toEqual([-1, 1]);
  });

  it('keeps a label above when both sides are taken', () => {
    const between = { x: 0, z: 1, width: 4, height: 2 };
    expect(labelOffsets([spot(0, 0), spot(0, 4), between])).toEqual([
      -1, -1, -2,
    ]);
  });
});
