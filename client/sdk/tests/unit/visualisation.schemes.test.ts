import { SCHEMES, colourAt, position } from 'src/index';

describe('the colour schemes of the encodings', () => {
  it('gives the first and last stop at the ends of a scheme', () => {
    expect(colourAt('viridis', 0)).toBe(SCHEMES.viridis[0]);
    expect(colourAt('viridis', 1)).toBe(SCHEMES.viridis[4]);
  });

  it('falls back to heat for a scheme it does not know', () => {
    expect(colourAt('no-such-scheme', 0)).toBe(SCHEMES.heat[0]);
  });

  it('places a value in its domain, clamped', () => {
    expect(position(22, [18, 26])).toBe(0.5);
    expect(position(40, [18, 26])).toBe(1);
    expect(position(5, [5, 5])).toBe(0);
  });
});
