/**
 * The quantities a soil profile reports and how each is shown. Readings
 * travel in SenML units, as the naming convention requires: `/` for the
 * volumetric water content as a ratio, `Cel`, `S/m` and `Pa`. SenML has no
 * `kPa` and no `m3/m3`, so the conversions to per cent and kilopascal happen
 * on screen only.
 */

export interface QuantitySpec {
  readonly label: string;
  /** The SenML unit the reading travels in. */
  readonly unit: string;
  /** A colour scheme of the SDK, from low to high. */
  readonly scheme: string;
  /** The range the colour scale spans, in the SenML unit. */
  readonly domain: readonly [number, number];
}

export const QUANTITIES: Readonly<Record<string, QuantitySpec>> = {
  soil_moisture: {
    label: 'Volumetric water content',
    unit: '/',
    scheme: 'viridis',
    domain: [0, 0.5],
  },
  soil_temperature: {
    label: 'Soil temperature',
    unit: 'Cel',
    scheme: 'heat',
    domain: [-5, 30],
  },
  electrical_conductivity: {
    label: 'Electrical conductivity',
    unit: 'S/m',
    scheme: 'viridis',
    domain: [0, 0.3],
  },
  matric_potential: {
    label: 'Matric potential',
    unit: 'Pa',
    scheme: 'viridis',
    // From the permanent wilting point, -1500 kPa, to saturation.
    domain: [-1_500_000, 0],
  },
};

const DISPLAY: Readonly<Record<string, (value: number) => string>> = {
  '/': (value) => `${(value * 100).toFixed(1)} %`,
  Cel: (value) => `${value.toFixed(1)} °C`,
  'S/m': (value) => `${value.toFixed(3)} S/m`,
  Pa: (value) => `${(value / 1000).toFixed(1)} kPa`,
};

/** The SenML unit of a quantity, or `undefined` for one the kit does not know. */
export const unitOf = (quantity: string): string | undefined =>
  QUANTITIES[quantity]?.unit;

/** A reading in its display unit, such as `23.4 %` for a ratio of 0.234. */
export function formatReading(value: unknown, unit?: string): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'no reading';
  const display = unit === undefined ? undefined : DISPLAY[unit];
  return display ? display(value) : `${value} ${unit ?? ''}`.trim();
}
