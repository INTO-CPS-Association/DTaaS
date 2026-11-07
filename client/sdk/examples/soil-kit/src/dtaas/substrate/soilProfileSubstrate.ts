/**
 * The `soil-profile` substrate: the sensors of a soil profile, one row per
 * depth, in two charts. The first shows the latest value at each depth at the
 * playhead, the second a time by depth heatmap of the window before it. Each
 * pane draws one quantity, the one its descriptor names in
 * `options.quantity` or else the quantity of its first anchor.
 *
 * Values come from the host's signals service only: `valueAt` at the
 * playhead for the first chart and `range` for the heatmap, so the kit opens
 * no connection of its own.
 */

import type {
  Anchor,
  ElementRef,
  HostServices,
  ResolvedEncoding,
  SubstrateAdapter,
  SubstrateDescriptor,
} from '@into-cps-association/dtaas-sdk';
import {
  byDepth,
  heatmapGrid,
  QUANTITIES,
  sensorOf,
  SOIL_DEPTH,
  SOIL_PROFILE,
  type QuantitySpec,
  type SoilSensor,
} from 'examples/soil-kit/src/core';
import drawHeatmap from './heatmapChart';
import { drawProfile } from './profileChart';
import { chart } from './svg';

const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const BINS = 48;
const DEFAULT_HOURS = 24;

/** What one mounted pane holds between calls of the core. */
interface PaneState {
  quantity?: string;
  hours: number;
  readonly sensors: Map<string, SoilSensor>;
  readonly colours: Map<string, string>;
  /** The minute of the playhead the heatmap was last read for. */
  minute?: number;
  disposed: boolean;
}

function createPane() {
  const frame = document.createElement('div');
  frame.setAttribute('aria-label', 'Soil profile');
  const caption = document.createElement('p');
  const latest = chart('Latest value at each depth');
  const heatmap = chart('Values by time and depth');
  frame.append(caption, latest, heatmap);
  return { frame, caption, latest, heatmap };
}

type Pane = ReturnType<typeof createPane>;

function optionsOf(state: PaneState, descriptor: SubstrateDescriptor) {
  const { quantity, windowHours } = descriptor.options ?? {};
  if (typeof quantity === 'string') state.quantity = quantity;
  if (typeof windowHours === 'number' && windowHours > 0) {
    state.hours = windowHours;
  }
}

/** Keep a sensor of the pane's quantity as a row; leave others out. */
function resolveSensor(state: PaneState, anchor: Anchor): ElementRef | null {
  const sensor = sensorOf(anchor);
  if (!sensor) return null;
  state.quantity ??= sensor.quantity;
  if (sensor.quantity !== state.quantity) return null;
  state.sensors.set(sensor.signalPath, sensor);
  return { substrate: SOIL_PROFILE, id: sensor.signalPath };
}

/** The quantity's scale, or the kit's moisture scale for one it does not know. */
const specOf = (state: PaneState): QuantitySpec =>
  QUANTITIES[state.quantity ?? ''] ?? {
    ...QUANTITIES.soil_moisture,
    label: state.quantity ?? 'No sensor',
    unit: '',
  };

const rowsOf = (state: PaneState) => [...state.sensors.values()].sort(byDepth);

function drawLatest(
  host: HostServices,
  pane: Pane,
  state: PaneState,
  t: number,
) {
  const spec = specOf(state);
  pane.caption.textContent = spec.label;
  const rows = rowsOf(state).map((sensor) => ({
    sensor,
    value: host.signals.valueAt(sensor.signalPath, 'measured', t)?.value,
    colour: state.colours.get(sensor.signalPath),
  }));
  drawProfile(pane.latest, rows, spec);
}

/** Read the window before the playhead once a minute and draw it. */
function drawHistory(
  host: HostServices,
  pane: Pane,
  state: PaneState,
  t: number,
) {
  const minute = Math.floor(t / MINUTE_MS);
  if (minute === state.minute) return;
  state.minute = minute;
  const sensors = rowsOf(state);
  const paths = sensors.map((sensor) => sensor.signalPath);
  const to = (minute + 1) * MINUTE_MS;
  const window = { from: to - state.hours * HOUR_MS, to, bins: BINS };
  host.signals
    .range(paths, 'measured', window.from, window.to)
    .then((samples) => {
      // A later minute or a disposed pane makes this answer stale.
      if (state.disposed || state.minute !== minute) return;
      const grid = heatmapGrid(samples, paths, window);
      drawHeatmap(pane.heatmap, sensors, grid, specOf(state), state.hours);
    })
    .catch((error: Error) =>
      host.logger.warn('The soil profile history was not read.', error),
    );
}

/** A colour that an encoding of the visualisation gives a depth. */
function keepColour(
  state: PaneState,
  ref: ElementRef,
  resolved: ResolvedEncoding,
) {
  const colour = resolved.properties.fill ?? resolved.properties.color;
  if (typeof colour === 'string') state.colours.set(ref.id, colour);
}

const rowElement = (pane: Pane, id: string) =>
  [...pane.latest.querySelectorAll('[data-signal]')].find(
    (element) => element.getAttribute('data-signal') === id,
  );

function pickRow(pane: Pane, x: number, y: number): ElementRef | null {
  const hit = document.elementFromPoint?.(x, y)?.closest('[data-signal]');
  const id = hit && pane.frame.contains(hit) && hit.getAttribute('data-signal');
  return id ? { substrate: SOIL_PROFILE, id } : null;
}

const freshState = (): PaneState => ({
  hours: DEFAULT_HOURS,
  sensors: new Map(),
  colours: new Map(),
  disposed: false,
});

function disposePane(pane: Pane, state: PaneState) {
  state.disposed = true;
  pane.frame.remove();
}

export default function createSoilProfileSubstrate(
  host: HostServices,
): SubstrateAdapter {
  const pane = createPane();
  const state = freshState();
  return {
    id: SOIL_PROFILE,
    supports: [SOIL_DEPTH],
    async mount(container, descriptor) {
      optionsOf(state, descriptor);
      container.append(pane.frame);
    },
    resolve: (anchor) => resolveSensor(state, anchor),
    apply: (ref, resolved) => keepColour(state, ref, resolved),
    frame: (ref) =>
      rowElement(pane, ref.id)?.scrollIntoView?.({ block: 'nearest' }),
    pick: (x, y) => pickRow(pane, x, y),
    setTime(t) {
      drawLatest(host, pane, state, t);
      drawHistory(host, pane, state, t);
    },
    dispose: () => disposePane(pane, state),
  };
}
