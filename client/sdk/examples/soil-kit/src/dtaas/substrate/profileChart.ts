/**
 * The latest value at each depth of a profile: one row per depth, its bar as
 * long as the value is far along the scale of its quantity and the value in
 * its display unit beside the bar, never on it.
 */

import { position } from '@into-cps-association/dtaas-sdk';
import {
  formatDepth,
  formatReading,
  type QuantitySpec,
  type SoilSensor,
} from 'examples/soil-kit/src/core';
import { colourOf, label, LAYOUT, resize, svgElement } from './svg';

export interface ProfileRow {
  readonly sensor: SoilSensor;
  readonly value: unknown;
  /** The colour an encoding of the visualisation gave the row, if any. */
  readonly colour?: string;
}

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/** The track of the scale and the bar of the value when there is one. */
function bars(row: ProfileRow, spec: QuantitySpec, y: number) {
  const box = { x: LAYOUT.label, y: y + 4, height: LAYOUT.row - 8 };
  const track = svgElement('rect', {
    ...box,
    width: LAYOUT.bar,
    fill: 'currentColor',
    'fill-opacity': 0.08,
  });
  if (!isNumber(row.value)) return [track];
  const bar = svgElement('rect', {
    ...box,
    width: position(row.value, spec.domain) * LAYOUT.bar,
    fill: row.colour ?? colourOf(row.value, spec),
  });
  return [track, bar];
}

function rowGroup(row: ProfileRow, spec: QuantitySpec, index: number) {
  const y = index * LAYOUT.row;
  const reading = formatReading(row.value, spec.unit);
  const depth = `${row.sensor.profile}, ${formatDepth(row.sensor)}`;
  const group = svgElement('g', { 'data-signal': row.sensor.signalPath });
  const title = svgElement('title');
  title.textContent = `${depth}: ${reading}`;
  group.append(
    title,
    label(depth, { x: 0, y: y + 18 }),
    ...bars(row, spec, y),
    label(reading, { x: LAYOUT.label + LAYOUT.bar + 8, y: y + 18 }),
  );
  return group;
}

/** Draw the rows of a profile into `svg`, replacing what it showed. */
export function drawProfile(
  svg: SVGSVGElement,
  rows: readonly ProfileRow[],
  spec: QuantitySpec,
) {
  resize(svg, rows.length);
  rows.forEach((row, index) => svg.append(rowGroup(row, spec, index)));
}
