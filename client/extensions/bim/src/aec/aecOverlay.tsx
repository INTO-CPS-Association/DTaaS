/**
 * The React side of the `aec` substrate, laid out as the Buildings page: the
 * toolbar and floor picker above the canvas, and under it the facts of the
 * picked object on the left and the legends on the right, so no panel ever
 * covers another or the model. A substrate owns no React tree, so it mounts
 * its own root, in the theme the host gives, and unmounts it on dispose.
 */

import {
  Fragment,
  useSyncExternalStore,
  type ComponentType,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import type { ClassEntry } from './aecAppearance';
import ObjectPanel, { type PickedObject } from './aecObjectPanel';
import { ClassLegend, HeatLegend, HelpPanel } from './aecLegend';
import type { OptionContext } from './aecShortcuts';
import { FloorPicker, Toolbar } from './aecToolbar';

/** What the overlay reads, and the change counter it redraws on. */
export interface OverlayModel {
  readonly context: OptionContext;
  readonly storeys: readonly string[];
  readonly ui: { helpOpen: boolean; readonly missing: string[] };
  picked(): PickedObject | null;
  classes(): readonly ClassEntry[];
  showFloor(storey: string | null): void;
  pickClass(ifcClass: string): void;
  closeHelp(): void;
  subscribe(listener: () => void): () => void;
  revision(): number;
}

/** A change counter React can subscribe to. */
export function changes() {
  let count = 0;
  const listeners = new Set<() => void>();
  return {
    revision: () => count,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    bump() {
      count += 1;
      listeners.forEach((listener) => listener());
    },
  };
}

function TopRow({ model }: { readonly model: OverlayModel }) {
  const { context } = model;
  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        columnGap: 1,
      }}
    >
      <Toolbar context={context} />
      <FloorPicker
        storeys={model.storeys}
        current={context.state.storey}
        onChange={model.showFloor}
      />
    </Box>
  );
}

function Legends({ model }: { readonly model: OverlayModel }) {
  const { state } = model.context;
  return (
    <Stack sx={{ flex: '1 1 260px', minWidth: 0, gap: 1 }}>
      <HeatLegend colours={model.context.colours} />
      <ClassLegend
        classes={model.classes()}
        highlighted={state.highlightedClass}
        onPick={model.pickClass}
      />
    </Stack>
  );
}

const PANELS = {
  display: 'flex',
  gap: 2,
  mt: 1,
  flexWrap: 'wrap',
  alignItems: 'flex-start',
};

function BottomRow({ model }: { readonly model: OverlayModel }) {
  const { missing } = model.ui;
  return (
    <>
      {missing.length > 0 && (
        <Alert severity="info" role="status" sx={{ mt: 1 }}>
          Not on this model: {missing.join(', ')}
        </Alert>
      )}
      <Box sx={PANELS}>
        <Box sx={{ flex: '1 1 320px', minWidth: 0 }}>
          <ObjectPanel picked={model.picked()} />
        </Box>
        <Legends model={model} />
      </Box>
    </>
  );
}

/** The host's theme, which wraps what the overlay draws. */
export type ThemeRoot = ComponentType<{ readonly children: ReactNode }>;

function Overlay(props: {
  readonly model: OverlayModel;
  readonly below: HTMLElement;
  readonly Theme: ThemeRoot;
}) {
  const { model, Theme } = props;
  useSyncExternalStore(model.subscribe, model.revision);
  return (
    <Theme>
      <TopRow model={model} />
      {createPortal(<BottomRow model={model} />, props.below)}
      <HelpPanel open={model.ui.helpOpen} onClose={model.closeHelp} />
    </Theme>
  );
}

/** Draw the overlay into the rows above and below the canvas, and return
 * the function that takes it down. */
export function mountOverlay(
  above: HTMLElement,
  below: HTMLElement,
  model: OverlayModel,
  Theme: ThemeRoot = Fragment,
) {
  const root = createRoot(above);
  root.render(<Overlay model={model} below={below} Theme={Theme} />);
  // Deferred, since a pane is disposed while React commits the page.
  return () => queueMicrotask(() => root.unmount());
}
