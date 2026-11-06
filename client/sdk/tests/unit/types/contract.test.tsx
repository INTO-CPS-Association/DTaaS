/**
 * Compile-time checks of the public contract. ts-jest type-checks this file,
 * so a type regression fails the suite even though the runtime asserts are
 * trivial.
 */
import { lazy } from 'react';
import { createSlice } from '@reduxjs/toolkit';
import { z } from 'zod';
import type {
  DtaasExtension,
  ExtensionReducer,
  HostServices,
  SignalSample,
  SignalsService,
  SubstrateAdapter,
  VisualisationAsset,
} from 'src/index';
import fakeHostServices from 'src/testing/fakeHostServices';

const Page = lazy(async () => ({ default: () => <p>page</p> }));
const Tab = lazy(async () => ({
  default: ({ dt }: { dt: { name: string } }) => <p>{dt.name}</p>,
}));

const counter = createSlice({
  name: 'hello',
  initialState: { count: 0 },
  reducers: {
    increment: (state) => {
      state.count += 1;
    },
  },
});

const fullExtension: DtaasExtension<{ count: number }> = {
  id: 'hello',
  name: 'Hello',
  version: '0.1.0',
  sdk: 1,
  routes: [{ path: '', element: Page }],
  navigation: [{ label: 'Hello', path: '/hello', order: 10 }],
  digitalTwinTabs: [
    { id: 'hello', label: 'Hello', applies: () => true, element: Tab },
  ],
  assetPreviews: [{ id: 'txt', extensions: ['.txt'], element: Page }],
  reducer: counter.reducer,
  config: { schema: z.object({ greeting: z.string() }) },
  setup: async (host: HostServices) => {
    host.logger.info(host.config(z.object({ greeting: z.string() })));
  },
  visualisation: {
    detect: (dt) => dt.files.some((f) => f.endsWith('.hello')),
    anchorKinds: [
      { kind: 'hello-node', substrates: ['image'], resolve: () => null },
    ],
    converters: [
      {
        id: 'hello-to-json',
        from: ['.hello'],
        to: 'json',
        load: async () => ({
          default: async (input) => ({ format: 'json', bytes: input.bytes }),
        }),
      },
    ],
    presets: [
      {
        id: 'hello.warmth',
        label: 'Warmth',
        substrate: 'image',
        encodings: [
          {
            target: 'hello/*/t',
            encoding: { type: 'colorScale', domain: [0, 1], scheme: 'warm' },
          },
        ],
      },
    ],
    inspectorPanel: lazy(async () => ({ default: () => null })),
  },
};

describe('contract types', () => {
  it('accept a fully populated extension', () => {
    expect(fullExtension.sdk).toBe(1);
  });

  it('accept a Redux Toolkit reducer as an extension reducer', () => {
    const accept = (r: ExtensionReducer<{ count: number }>) => r;
    const reducer = accept(counter.reducer);
    expect(reducer(undefined, counter.actions.increment())).toEqual({
      count: 1,
    });
  });

  it('reject an extension built for another SDK major', () => {
    // @ts-expect-error sdk must be 1
    const wrong: DtaasExtension = { id: 'x', name: 'x', version: '1', sdk: 2 };
    expect(wrong).toBeDefined();
  });

  it('reject an eager route element', () => {
    const eager: DtaasExtension = {
      id: 'x',
      name: 'x',
      version: '1',
      sdk: 1,
      // @ts-expect-error route elements must be React.lazy components
      routes: [{ path: '', element: () => null }],
    };
    expect(eager).toBeDefined();
  });

  it('requires SignalsService.connection', () => {
    const { connection, ...withoutConnection } = fakeHostServices().signals;
    // @ts-expect-error connection is required
    const signals: SignalsService = withoutConnection;
    expect(connection.get()).toBe('live');
    expect(signals).toBeDefined();
  });

  it('describe the layer types of the report', () => {
    const sample: SignalSample = {
      twinId: 'j7',
      signalPath: 'j7/armA/queueLen',
      channel: 'measured',
      ts: 0,
      value: 3,
    };
    const adapter: Pick<SubstrateAdapter, 'id' | 'supports'> = {
      id: 'image',
      supports: ['image-region', 'hello-node'],
    };
    const asset: Pick<VisualisationAsset, 'schemaVersion'> = {
      schemaVersion: '1.1',
    };
    expect([sample.channel, adapter.id, asset.schemaVersion]).toEqual([
      'measured',
      'image',
      '1.1',
    ]);
  });
});
