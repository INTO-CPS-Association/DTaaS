/**
 * The time by depth heatmap of one quantity: a row per depth and a column
 * per stretch of the window before the playhead. Under it come the time axis
 * and the colour scale with its ends in the display unit.
 */

import {
  formatDepth,
  formatReading,
  type QuantitySpec,
  type SoilSensor,
} from 'examples/soil-kit/src/core';
import { colourOf, label, LAYOUT, resize, svgElement } from './svg';

const SWATCHES = 5;
const AXIS_WIDTH = LAYOUT.width - LAYOUT.label;

/** The cells of one depth; an empty stretch has no cell. */
function cells(
  means: readonly (number | undefined)[],
  spec: QuantitySpec,
  y: number,
) {
  const width = AXIS_WIDTH / means.length;
  return means.flatMap((mean, bin) =>
    mean === undefined
      ? []
      : [
          svgElement('rect', {
            x: LAYOUT.label + bin * width,
            y,
            width,
            height: LAYOUT.row - 2,
            fill: colourOf(mean, spec),
          }),
        ],
  );
}

/** The scale from the low end of the quantity to its high end. */
function legend(spec: QuantitySpec, y: number) {
  const [min, max] = spec.domain;
  const swatches = Array.from({ length: SWATCHES }, (_, i) =>
    svgElement('rect', {
      x: LAYOUT.label + 70 + i * 24,
      y: y - 11,
      width: 24,
      height: 14,
      fill: colourOf(min + ((max - min) * i) / (SWATCHES - 1), spec),
    }),
  );
  return [
    label(formatReading(min, spec.unit), { x: LAYOUT.label, y }),
    ...swatches,
    label(formatReading(max, spec.unit), {
      x: LAYOUT.label + 70 + SWATCHES * 24 + 6,
      y,
    }),
  ];
}

/** Draw the grid of bin means, one row per sensor, into `svg`. */
export default function drawHeatmap(
  svg: SVGSVGElement,
  sensors: readonly SoilSensor[],
  grid: readonly (readonly (number | undefined)[])[],
  spec: QuantitySpec,
  hours: number,
) {
  resize(svg, sensors.length, LAYOUT.footer);
  sensors.forEach((sensor, index) => {
    const y = index * LAYOUT.row;
    svg.append(
      label(formatDepth(sensor), { x: 0, y: y + 18 }),
      ...cells(grid[index] ?? [], spec, y),
    );
  });
  const axis = sensors.length * LAYOUT.row + 16;
  svg.append(
    label(`${hours} h before`, { x: LAYOUT.label, y: axis }),
    label('playhead', { x: LAYOUT.width, y: axis, 'text-anchor': 'end' }),
    ...legend(spec, axis + 30),
  );
}
