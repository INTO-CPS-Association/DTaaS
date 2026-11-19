import fitHomography, { type Point } from 'viz/substrates/homography';

const SQUARE: Point[] = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
];

describe('fitting a homography', () => {
  it('maps the calibration points onto the picture exactly from four pairs', () => {
    const picture: Point[] = SQUARE.map(([x, y]) => [2 * x + 5, 3 * y + 7]);
    const map = fitHomography(SQUARE, picture);

    const [u, v] = map([4, 6]);

    expect(u).toBeCloseTo(13);
    expect(v).toBeCloseTo(25);
  });

  it('recovers a perspective map, where far points draw closer together', () => {
    const picture: Point[] = [
      [100, 400],
      [300, 400],
      [250, 100],
      [150, 100],
    ];
    const map = fitHomography(SQUARE, picture);

    SQUARE.forEach((point, i) => {
      expect(map(point)[0]).toBeCloseTo(picture[i][0]);
      expect(map(point)[1]).toBeCloseTo(picture[i][1]);
    });
  });

  it('refuses a calibration whose points lie on one line', () => {
    const line: Point[] = [
      [0, 0],
      [1, 1],
      [2, 2],
      [3, 3],
    ];

    expect(() => fitHomography(line, line)).toThrow('Degenerate calibration');
  });
});
