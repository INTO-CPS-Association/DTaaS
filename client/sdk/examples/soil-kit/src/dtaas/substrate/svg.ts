/**
 * The drawing primitives of the `soil-profile` substrate, in plain SVG. Text
 * and axes take `currentColor`, so they follow the colour of the host's page
 * in its light and dark themes. Only the data take the colours of the SDK's
 * schemes. No text is drawn on them.
 */

import { colourAt, position } from '@into-cps-association/dtaas-sdk';
import type { QuantitySpec } from 'examples/soil-kit/src/core';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** The geometry both charts share, in the units of their view box. */
export const LAYOUT = {
  width: 480,
  row: 28,
  label: 150,
  bar: 220,
  /** Room under the rows for the time axis and the legend. */
  footer: 56,
} as const;

export type Attributes = Readonly<Record<string, string | number>>;

export function svgElement<K extends keyof SVGElementTagNameMap>(
  name: K,
  attributes: Attributes = {},
): SVGElementTagNameMap[K] {
  const element = document.createElementNS(SVG_NS, name);
  Object.entries(attributes).forEach(([key, value]) =>
    element.setAttribute(key, String(value)),
  );
  return element;
}

/** Text in the page's own colour. */
export function label(content: string, attributes: Attributes) {
  const text = svgElement('text', { fill: 'currentColor', ...attributes });
  text.textContent = content;
  return text;
}

/** An empty chart that scales to the width of its pane. */
export function chart(name: string): SVGSVGElement {
  return svgElement('svg', {
    role: 'img',
    'aria-label': name,
    width: '100%',
    'font-size': 12,
  });
}

/** Give a chart the height of its rows and clear what it showed. */
export function resize(svg: SVGSVGElement, rows: number, footer = 0) {
  const height = rows * LAYOUT.row + footer;
  svg.setAttribute('viewBox', `0 0 ${LAYOUT.width} ${height}`);
  svg.replaceChildren();
}

/** The colour of a value on the scale of its quantity. */
export const colourOf = (value: number, spec: QuantitySpec): string =>
  colourAt(spec.scheme, position(value, spec.domain));
