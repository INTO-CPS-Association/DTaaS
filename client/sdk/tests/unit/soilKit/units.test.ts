import { formatReading, QUANTITIES, unitOf } from 'examples/soil-kit/src/core';

describe('soil units', () => {
  it('names the SenML unit of each quantity', () => {
    expect(unitOf('soil_moisture')).toBe('/');
    expect(unitOf('soil_temperature')).toBe('Cel');
    expect(unitOf('electrical_conductivity')).toBe('S/m');
    expect(unitOf('matric_potential')).toBe('Pa');
    expect(unitOf('wind_speed')).toBeUndefined();
  });

  it.each([
    [0.234, '/', '23.4 %'],
    [12.345, 'Cel', '12.3 °C'],
    [0.0425, 'S/m', '0.043 S/m'],
    [-33_000, 'Pa', '-33.0 kPa'],
    [3, 'm/s', '3 m/s'],
    [3, undefined, '3'],
  ])('shows %p in %p as %p', (value, unit, shown) => {
    expect(formatReading(value, unit)).toBe(shown);
  });

  it.each([undefined, 'wet', Number.NaN, Number.POSITIVE_INFINITY])(
    'says there is no reading for %p',
    (value) => {
      expect(formatReading(value, '/')).toBe('no reading');
    },
  );

  it('spans each colour scale from low to high', () => {
    Object.values(QUANTITIES).forEach(({ domain: [min, max] }) =>
      expect(max).toBeGreaterThan(min),
    );
  });
});
