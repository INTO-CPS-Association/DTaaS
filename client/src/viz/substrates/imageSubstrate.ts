/**
 * The `image` substrate: a photograph or a drawing, with the anchors drawn on
 * it as SVG shapes in the picture's own pixels, so they stay on their spot at
 * any width. A point is a dot, a region a polygon, and each takes the colour,
 * visibility, label and attention its encodings resolve to.
 */

import type {
  Anchor,
  ElementRef,
  HostServices,
  ResolvedEncoding,
  SubstrateAdapter,
  SubstrateDescriptor,
} from '@into-cps-association/dtaas-sdk';
import { anchorPixels } from 'viz/substrates/imageAnchors';

const SVG_NS = 'http://www.w3.org/2000/svg';
const POINT_RADIUS = 12;

interface Shape {
  readonly mark: SVGElement;
  readonly label: SVGTextElement;
}

function svgElement<K extends keyof SVGElementTagNameMap>(name: K) {
  return document.createElementNS(SVG_NS, name);
}

function shapeFor(points: readonly (readonly [number, number])[]): Shape {
  const label = svgElement('text');
  if (points.length === 1) {
    const [[x, y]] = points;
    const dot = svgElement('circle');
    dot.setAttribute('cx', String(x));
    dot.setAttribute('cy', String(y));
    dot.setAttribute('r', String(POINT_RADIUS));
    label.setAttribute('x', String(x + POINT_RADIUS * 1.5));
    label.setAttribute('y', String(y));
    return { mark: dot, label };
  }
  const region = svgElement('polygon');
  region.setAttribute('points', points.map((p) => p.join(',')).join(' '));
  region.setAttribute('fill-opacity', '0.5');
  label.setAttribute('x', String(points[0][0]));
  label.setAttribute('y', String(points[0][1]));
  return { mark: region, label };
}

/** Apply the visual properties of one resolved encoding to a shape. */
export function paint(
  { mark, label }: Shape,
  properties: Record<string, unknown>,
) {
  const colour = (properties.fill ?? properties.color) as string | undefined;
  if (colour) mark.setAttribute('fill', colour);
  if ('visible' in properties) {
    const shown = properties.visible !== false;
    [mark, label].forEach((e) =>
      e.setAttribute('visibility', shown ? 'visible' : 'hidden'),
    );
  }
  if (typeof properties.text === 'string') label.textContent = properties.text;
  if ('attention' in properties) {
    mark.setAttribute('stroke', properties.attention ? '#d7191c' : 'none');
    mark.setAttribute('stroke-width', properties.attention ? '6' : '0');
  }
}

/**
 * Put the picture in the container with the SVG layer over it, and size the
 * layer to the picture's own pixels once it has loaded.
 */
async function mountPicture(
  container: HTMLElement,
  frame: HTMLDivElement,
  svg: SVGSVGElement,
  src: string,
): Promise<void> {
  const img = document.createElement('img');
  img.alt = '';
  Object.assign(frame.style, {
    position: 'relative',
    display: 'inline-block',
    width: '100%',
  });
  Object.assign(img.style, { display: 'block', width: '100%' });
  Object.assign(svg.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
  });
  frame.append(img, svg);
  container.append(frame);
  img.src = src;
  await img.decode();
  svg.setAttribute('viewBox', `0 0 ${img.naturalWidth} ${img.naturalHeight}`);
}

/** The anchors drawn on the SVG layer, by signal path. */
function anchorLayer(
  svg: SVGSVGElement,
  descriptorOf: () => SubstrateDescriptor,
) {
  const shapes = new Map<string, Shape>();
  return {
    resolve(anchor: Anchor): ElementRef | null {
      const points = anchorPixels(anchor, descriptorOf());
      if (!points) return null;
      const shape = shapeFor(points);
      svg.append(shape.mark, shape.label);
      shapes.set(anchor.signalPath, shape);
      return { substrate: 'image', id: anchor.signalPath, handle: shape };
    },
    apply(ref: ElementRef, encoding: ResolvedEncoding) {
      const shape = shapes.get(ref.id);
      if (shape) paint(shape, encoding.properties);
    },
    frame(ref: ElementRef) {
      shapes.get(ref.id)?.mark.scrollIntoView?.({ block: 'center' });
    },
  };
}

export default function createImageSubstrate(
  host: HostServices,
): SubstrateAdapter {
  const frame = document.createElement('div');
  const svg = svgElement('svg');
  let descriptor: SubstrateDescriptor = { adapter: 'image' };
  return {
    id: 'image',
    supports: ['image-point', 'image-region'],
    async mount(container, given) {
      descriptor = given;
      if (!given.source) throw new Error('An image substrate needs a source');
      const src = await host.library.resolve(given.source);
      await mountPicture(container, frame, svg, src);
    },
    ...anchorLayer(svg, () => descriptor),
    pick: () => null,
    setTime: () => undefined,
    dispose: () => frame.remove(),
  };
}
