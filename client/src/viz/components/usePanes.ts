/**
 * Mount the substrate of every pane of a visualisation, and resolve the
 * anchors its encodings target. Unmounting disposes every substrate, so a
 * twin switched for another leaves nothing behind.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ElementRef,
  SubstrateAdapter,
  VisualisationAsset,
  VizService,
} from '@into-cps-association/dtaas-sdk';

export interface MountedPane {
  readonly adapter: SubstrateAdapter;
  /** The element each target signal is drawn on, by signal path. */
  readonly refs: ReadonlyMap<string, ElementRef>;
}

async function mountPane(
  pane: string,
  asset: VisualisationAsset,
  viz: VizService,
  container: HTMLElement,
): Promise<MountedPane> {
  const descriptor = asset.substrates[pane];
  const adapter = await viz.substrates.get(descriptor.adapter);
  await adapter.mount(container, descriptor);
  const targets = new Set(
    asset.encodings.filter((e) => e.substrate === pane).map((e) => e.target),
  );
  const refs = new Map<string, ElementRef>();
  asset.anchors
    .filter((anchor) => targets.has(anchor.signalPath))
    .forEach((anchor) => {
      const ref = adapter.resolve(anchor);
      if (ref) refs.set(anchor.signalPath, ref);
    });
  return { adapter, refs };
}

type Setter<T> = (update: (current: Map<string, T>) => Map<string, T>) => void;

/** Mount every pane that has a container, and return the cleanup. */
function mountAll(
  asset: VisualisationAsset,
  viz: VizService,
  containers: ReadonlyMap<string, HTMLElement>,
  setPanes: Setter<MountedPane>,
  setProblems: Setter<string>,
) {
  const mounted: SubstrateAdapter[] = [];
  let gone = false;
  asset.layout.panes.forEach((pane) => {
    const container = containers.get(pane);
    if (!container) return;
    mountPane(pane, asset, viz, container)
      .then((result) => {
        // A pane that finishes mounting after the twin was left is removed at
        // once, since the cleanup below has already run.
        if (gone) return result.adapter.dispose();
        mounted.push(result.adapter);
        return setPanes((current) => new Map(current).set(pane, result));
      })
      .catch((error: Error) =>
        setProblems((current) => new Map(current).set(pane, error.message)),
      );
  });
  return () => {
    gone = true;
    mounted.forEach((adapter) => adapter.dispose());
  };
}

export default function usePanes(asset: VisualisationAsset, viz: VizService) {
  const containers = useRef(new Map<string, HTMLElement>());
  const [panes, setPanes] = useState(new Map<string, MountedPane>());
  const [problems, setProblems] = useState(new Map<string, string>());
  useEffect(
    () => mountAll(asset, viz, containers.current, setPanes, setProblems),
    [asset, viz],
  );
  // Each pane's element is kept as React attaches it, for the effect above.
  const register = useCallback(
    (pane: string) => (element: HTMLElement | null) => {
      if (element) containers.current.set(pane, element);
    },
    [],
  );
  return { register, panes, problems };
}
