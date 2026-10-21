import type { Anchor } from '@into-cps-association/dtaas-sdk';
import { anchorPixels, parsePoints } from 'viz/substrates/imageAnchors';

const picture = { adapter: 'image', source: 'lib://j7.jpg' };

const anchor = (kind: string, ref: string, homographyId?: string): Anchor => ({
  signalPath: 'j7/lane1/queue',
  kind,
  ref,
  homographyId,
});

describe('image anchors', () => {
  it('reads points written as in SVG', () => {
    expect(parsePoints(' 1,2  3.5,4 ')).toEqual([
      [1, 2],
      [3.5, 4],
    ]);
    expect(() => parsePoints('1,2 x')).toThrow('not a list of x,y points');
  });

  it('places a point and a region in the pixels of the picture', () => {
    expect(anchorPixels(anchor('image-point', '40,50'), picture)).toEqual([
      [40, 50],
    ]);
    expect(
      anchorPixels(anchor('image-region', '0,0 10,0 10,10'), picture),
    ).toHaveLength(3);
  });

  it('refuses a region with fewer than three corners', () => {
    expect(() =>
      anchorPixels(anchor('image-region', '0,0 10,0'), picture),
    ).toThrow('needs 3 point(s)');
  });

  it('leaves an anchor of another kind to another substrate', () => {
    expect(anchorPixels(anchor('ifc-guid', 'abc'), picture)).toBeUndefined();
  });

  it('maps world coordinates through the calibration the anchor names', () => {
    const calibrated = {
      ...picture,
      calibration: {
        type: 'homography' as const,
        id: 'road',
        worldPoints: [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
        ] as [number, number][],
        imagePoints: [
          [100, 100],
          [200, 100],
          [200, 200],
          [100, 200],
        ] as [number, number][],
      },
    };

    const [[x, y]] = anchorPixels(
      anchor('image-point', '0.5,0.5', 'road'),
      calibrated,
    )!;

    expect(x).toBeCloseTo(150);
    expect(y).toBeCloseTo(150);
    expect(() =>
      anchorPixels(anchor('image-point', '0,0', 'bridge'), calibrated),
    ).toThrow('No calibration bridge');
  });
});
