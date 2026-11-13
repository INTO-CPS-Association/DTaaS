/**
 * Wires the controls of the `aec` substrate to its scene: the options and
 * their keys, hover and click on objects, the marker colours, and the React
 * overlay that draws the toolbar, the floor picker, the facts and legends.
 */

import type { Encoding } from '@into-cps-association/dtaas-sdk';
import type { MeshBasicMaterial } from 'three';
import { MarkerColours } from './aecColours';
import { NO_READING_COLOUR } from './aecMarkers';
import type { AecScene } from './aecScene';
import { handleKey, type OptionContext } from './aecShortcuts';
import { storeysOf } from './aecTree';
import {
  changes,
  mountOverlay,
  type OverlayModel,
  type ThemeRoot,
} from './aecOverlay';

export interface Controls {
  /** Give a marker the colour an encoding computed, as the heatmap allows. */
  colour(key: string, encoding: Encoding, colour: string): void;
  /** Name a sensor the model has no object for. */
  reportMissing(name: string): void;
  dispose(): void;
}

/** The rows of the pane: the controls, the canvas and the panels. */
export interface PaneRows {
  readonly frame: HTMLElement;
  readonly above: HTMLElement;
  readonly below: HTMLElement;
}

/** Give markers the colour the heatmap option says they show now. */
export function recolour(
  view: AecScene,
  colours: MarkerColours,
  keys: Iterable<string> = view.markers.all.keys(),
) {
  [...keys].forEach((key) => {
    const marker = view.markers.all.get(key);
    const material = marker?.dot.material as MeshBasicMaterial | undefined;
    material?.color.set(colours.colourOf(key) ?? NO_READING_COLOUR);
  });
  view.invalidate();
}

function toggleFullscreen() {
  const done = () => undefined; // a refused request changes nothing
  if (document.fullscreenElement) document.exitFullscreen().catch(done);
  else document.documentElement.requestFullscreen?.().catch(done);
}

/** Back to the model as it opened, seen from above. */
function resetAll(view: AecScene, colours: MarkerColours) {
  view.appearance.reset();
  colours.reset();
  view.look('top');
}

/** Redraw the model and the markers, then the overlay. */
function refresher(view: AecScene, colours: MarkerColours, bump: () => void) {
  return () => {
    view.refresh();
    recolour(view, colours);
    bump();
  };
}

function contextOf(
  view: AecScene,
  colours: MarkerColours,
  ui: OverlayModel['ui'],
  bump: () => void,
) {
  const refresh = refresher(view, colours, bump);
  const context: OptionContext = {
    state: view.appearance.state,
    hidden: view.appearance.hidden,
    colours,
    refresh,
    look: (from) => view.look(from),
    reset: () => {
      resetAll(view, colours);
      refresh();
    },
    toggleHelp: () => {
      ui.helpOpen = !ui.helpOpen;
      bump();
    },
    toggleFullscreen,
  };
  return context;
}

/** Hover and click on the canvas only, so the panels pick nothing. */
function onPointer(view: AecScene, refresh: () => void) {
  const { state } = view.appearance;
  const canvas = view.renderer.domElement;
  canvas.addEventListener('pointermove', (event) => {
    const globalId = view.objectAt(event.clientX, event.clientY);
    if (globalId === state.hovered) return;
    state.hovered = globalId;
    view.refresh();
  });
  canvas.addEventListener('click', (event) => {
    state.selected = view.objectAt(event.clientX, event.clientY);
    refresh();
  });
}

/** The picked object with its facts, its size and the sensor on it. */
function pickedOf(view: AecScene) {
  const globalId = view.appearance.state.selected;
  if (!globalId) return null;
  const key = view.markerOn(globalId);
  const marker = key ? view.markers.all.get(key) : undefined;
  return {
    globalId,
    facts: view.factsOf(globalId),
    size: view.sizeOf(globalId),
    sensor: key && marker ? { name: marker.name, signal: key } : undefined,
  };
}

/** What the overlay's own controls change: the floor, the class lit from
 * the legend, and the help dialog. */
function overlayActions(context: OptionContext, ui: OverlayModel['ui']) {
  const { state } = context;
  return {
    showFloor: (storey: string | null) => {
      state.storey = storey;
      context.refresh();
    },
    pickClass: (ifcClass: string) => {
      const same = state.highlightedClass === ifcClass;
      state.highlightedClass = same ? null : ifcClass;
      context.refresh();
    },
    closeHelp: () => {
      ui.helpOpen = false;
      context.refresh();
    },
  };
}

function modelOf(view: AecScene, colours: MarkerColours) {
  const counter = changes();
  const ui = { helpOpen: false, missing: [] as string[] };
  const context = contextOf(view, colours, ui, counter.bump);
  // The model's own colours never change, so they are read once.
  const classes = view.appearance.classes();
  return {
    ...counter,
    ...overlayActions(context, ui),
    ui,
    context,
    storeys: storeysOf(view.tree),
    picked: () => pickedOf(view),
    classes: () => classes,
  };
}

/** Put the controls around the canvas and connect them to the scene. */
export function addControls(
  view: AecScene,
  rows: PaneRows,
  Theme?: ThemeRoot,
): Controls {
  const colours = new MarkerColours();
  const model = modelOf(view, colours);
  const unmount = mountOverlay(rows.above, rows.below, model, Theme);
  rows.frame.addEventListener('keydown', (e) => {
    if (handleKey(e, model.context)) e.preventDefault();
  });
  onPointer(view, model.context.refresh);
  model.context.refresh();
  return {
    colour: (key, encoding, colour) => {
      // A new colour rule changes the legend and the heatmap's choices.
      if (colours.record(key, encoding, colour)) model.bump();
      recolour(view, colours, [key]);
    },
    reportMissing: (name) => {
      // The core may resolve the same anchor again, so a name is kept once.
      if (model.ui.missing.includes(name)) return;
      model.ui.missing.push(name);
      model.bump();
    },
    dispose: unmount,
  };
}
