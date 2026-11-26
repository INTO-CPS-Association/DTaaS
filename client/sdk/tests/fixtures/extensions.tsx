import { lazy } from 'react';
import type { DtaasExtension } from 'src/index';

export const LazyPage = lazy(() =>
  Promise.resolve({
    default: () => <p>fixture page</p>,
  }),
);

export const Eager = () => <p>eager</p>;

/** A valid extension using every contribution point; tests mutate a copy. */
export const validExtension = (): DtaasExtension => ({
  id: 'demo',
  name: 'Demo',
  version: '0.1.0',
  sdk: 0,
  routes: [
    { path: '', element: LazyPage },
    { path: 'detail', element: LazyPage },
  ],
  navigation: [{ label: 'Demo', path: '/demo' }],
  digitalTwinTabs: [
    {
      id: 'schematic',
      label: 'Schematic',
      applies: () => true,
      element: LazyPage,
    },
  ],
  assetPreviews: [{ id: 'inp', extensions: ['.inp'], element: LazyPage }],
  visualisation: {
    detect: () => true,
    anchorKinds: [
      { kind: 'demo-node', substrates: ['pid'], resolve: () => null },
    ],
    converters: [
      {
        id: 'inp-to-graph',
        from: ['.inp'],
        to: 'graph',
        load: () =>
          Promise.resolve({
            default: () =>
              Promise.resolve({ format: 'graph', bytes: new Uint8Array() }),
          }),
      },
    ],
    presets: [
      {
        id: 'demo.pressure',
        label: 'Pressure',
        substrate: 'pid',
        encodings: [
          {
            target: 'net/*/pressure',
            encoding: { type: 'colorScale', domain: [0, 10], scheme: 'blues' },
          },
        ],
      },
    ],
    scopes: [{ id: 'zone', label: 'Pressure zone', group: () => ({}) }],
    fieldKernels: [
      {
        id: 'idw',
        load: () => Promise.resolve({ default: () => new Float32Array() }),
      },
    ],
    substrates: [
      {
        id: 'pid',
        supports: ['demo-node'],
        load: () => Promise.resolve({ default: () => ({}) as never }),
      },
    ],
    inspectorPanel: lazy(() => Promise.resolve({ default: () => null })),
  },
});

/** Untyped extension data, for tests that break the contract on purpose. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LooseExtension = Record<string, any>;

export const looseExtension = (): LooseExtension => validExtension();
