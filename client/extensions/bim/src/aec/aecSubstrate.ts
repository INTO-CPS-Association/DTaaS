/**
 * The `aec` substrate (architecture, engineering and construction): a
 * building model in 3D, the peer of the `image` substrate. Each anchor names
 * an IFC object by its GlobalId, and the sensor gets a marker on that object
 * with a label, which the resolved encodings colour and fill with the value.
 * Around the canvas sit the options of the Buildings page, laid out as on
 * that page: the toolbar and floor picker above it, the facts of a picked
 * object and the legends below it.
 *
 * It draws the converted model (GLB), which the Buildings page of bim-kit
 * converts from IFC and stores beside the IFC.
 */

import type {
  Anchor,
  ElementRef,
  HostServices,
  ResolvedEncoding,
  SubstrateAdapter,
  SubstrateDescriptor,
} from '@into-cps-association/dtaas-sdk';
import type { Controls, PaneRows } from './aecControls';
import type { Marker } from './aecMarkers';
import type { AecScene } from './aecScene';
import { modelAddress, sensorName } from './aecModel';

const ID = 'aec';
const ANCHOR_KIND = 'ifc-guid';

/** The pane: a row of controls, the canvas, and a row of panels. The
 * canvas gets a height, since a canvas has none of its own. */
function paneRows(): PaneRows & { canvas: HTMLElement } {
  const [frame, above, canvas, below] = [0, 1, 2, 3].map(() =>
    document.createElement('div'),
  );
  frame.tabIndex = 0; // so the keys reach the options
  frame.setAttribute('aria-label', 'Building model');
  Object.assign(canvas.style, {
    position: 'relative',
    width: '100%',
    height: '70vh',
    minHeight: '360px',
  });
  frame.append(above, canvas, below);
  return { frame, above, canvas, below };
}

/** Apply the visual properties of one resolved encoding to a marker. A
 * colour goes through the heatmap option, which may show another. */
function paint(
  view: AecScene,
  controls: Controls,
  [key, marker]: [string, Marker],
  resolved: ResolvedEncoding,
) {
  const { properties } = resolved;
  const colour = (properties.fill ?? properties.color) as string | undefined;
  if (colour) controls.colour(key, resolved.encoding, colour);
  if ('visible' in properties) {
    const shown = properties.visible !== false;
    marker.dot.visible = shown;
    marker.label.visible = shown;
  }
  if (typeof properties.text === 'string') {
    view.markers.relabel(marker, `${marker.name} ${properties.text}`);
  }
}

/** Load the scene code, draw the model and put the controls around it. */
async function drawModel(
  rows: ReturnType<typeof paneRows>,
  url: string,
  host: HostServices,
) {
  const [{ AecScene: Scene3D }, { addControls }] = await Promise.all([
    import('./aecScene'),
    import('./aecControls'),
  ]);
  const view = new Scene3D(rows.canvas);
  try {
    await view.load(url);
  } catch {
    // The loader's own message names internal addresses, so the pane says
    // what the person can act on, and the WebGL context is given back.
    view.dispose();
    throw new Error(
      'The converted model (.glb) could not be loaded. Open the model once on the Buildings page to convert it.',
    );
  }
  return { view, controls: addControls(view, rows, host.ui.Theme) };
}

/** What a mounted pane holds once its model is drawn. */
interface Drawn {
  view: AecScene | null;
  controls: Controls | null;
}

const ref = (id: string): ElementRef => ({ substrate: ID, id });

/** Put a marker on the object an anchor names, or report it missing. */
function resolveAnchor({ view, controls }: Drawn, anchor: Anchor) {
  if (anchor.kind !== ANCHOR_KIND || !view) return null;
  const name = sensorName(anchor.signalPath, anchor.label);
  const object = view.meshes.get(anchor.ref)?.[0];
  if (!object) {
    controls?.reportMissing(name);
    return null;
  }
  view.markers.add(anchor.signalPath, object, name);
  return ref(anchor.signalPath);
}

function applyEncoding(
  { view, controls }: Drawn,
  target: ElementRef,
  resolved: ResolvedEncoding,
) {
  const marker = view?.markers.all.get(target.id);
  if (!marker || !view || !controls) return;
  paint(view, controls, [target.id, marker], resolved);
  view.invalidate();
}

function frameMarker({ view }: Drawn, target: ElementRef) {
  const marker = view?.markers.all.get(target.id);
  if (!marker || !view) return;
  view.controls.target.copy(marker.dot.position);
  view.invalidate();
}

function pickMarker({ view }: Drawn, x: number, y: number) {
  const key = view?.markerOn(view.objectAt(x, y)) ?? null;
  return key ? ref(key) : null;
}

function disposePane({ view, controls }: Drawn, frame: HTMLElement) {
  controls?.dispose();
  view?.dispose();
  frame.remove();
}

/** Where the converted model of a descriptor is served from. */
function modelUrl(host: HostServices, descriptor: SubstrateDescriptor) {
  if (!descriptor.source) throw new Error('An aec substrate needs a model');
  const address = modelAddress(
    descriptor.source,
    host.library.conventions.modelsDirectory,
  );
  return host.library.resolve(address);
}

export default function createAecSubstrate(
  host: HostServices,
): SubstrateAdapter {
  const rows = paneRows();
  const drawn: Drawn = { view: null, controls: null };
  return {
    id: ID,
    supports: [ANCHOR_KIND],
    async mount(container, descriptor: SubstrateDescriptor) {
      const url = modelUrl(host, descriptor);
      container.append(rows.frame);
      Object.assign(drawn, await drawModel(rows, await url, host));
    },
    resolve: (anchor: Anchor) => resolveAnchor(drawn, anchor),
    apply: (target, resolved) => applyEncoding(drawn, target, resolved),
    frame: (target) => frameMarker(drawn, target),
    pick: (x, y) => pickMarker(drawn, x, y),
    setTime: () => undefined, // a model has no time; the core moves values
    dispose: () => disposePane(drawn, rows.frame),
  };
}
