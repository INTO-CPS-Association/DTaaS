import type {
  ContentsService,
  DtaasExtension,
} from '@into-cps-association/dtaas-sdk';
import createVizService from 'viz/vizService';

const dt = { name: 'junction7', path: 'digital_twins/junction7', files: [] };

const asset = {
  schemaVersion: '1.0',
  name: 'junction-7',
  layout: { type: 'single', panes: ['photo'] },
  substrates: { photo: { adapter: 'image', source: 'lib://j7.jpg' } },
};

function memoryContents(files: Record<string, string> = {}) {
  const store = new Map(Object.entries(files));
  const contents: ContentsService = {
    exists: async (path) => store.has(path),
    get: async (path) => new TextEncoder().encode(store.get(path)),
    put: async (path, bytes) => {
      store.set(path, new TextDecoder().decode(bytes));
    },
    list: async () => [],
  };
  return { contents, store };
}

const noHost = () => {
  throw new Error('no host here');
};

describe('the visualisation service', () => {
  it('finds no visualisation for a twin that has none', async () => {
    const viz = createVizService(memoryContents().contents, [], noHost);

    await expect(viz.load(dt)).resolves.toBeNull();
  });

  it('reads and checks the visualisation.json in the twin folder', async () => {
    const { contents } = memoryContents({
      'digital_twins/junction7/visualisation.json': JSON.stringify(asset),
    });

    const loaded = await createVizService(contents, [], noHost).load(dt);

    expect(loaded?.name).toBe('junction-7');
    expect(loaded?.encodings).toEqual([]);
  });

  it('names the broken field of an invalid file', async () => {
    const { contents } = memoryContents({
      'digital_twins/junction7/visualisation.json': JSON.stringify({
        ...asset,
        layout: { type: 'single', panes: ['nowhere'] },
      }),
    });

    await expect(
      createVizService(contents, [], noHost).load(dt),
    ).rejects.toThrow('layout.panes.0');
  });

  it('saves a checked file, and refuses a merge request for now', async () => {
    const { contents, store } = memoryContents();
    const viz = createVizService(contents, [], noHost);

    await viz.save(dt, asset as never);

    expect(
      JSON.parse(store.get('digital_twins/junction7/visualisation.json')!).name,
    ).toBe('junction-7');
    await expect(
      viz.save(dt, asset as never, { viaMergeRequest: true }),
    ).rejects.toThrow('merge request');
  });

  it('offers the substrates, anchor kinds and presets extensions contribute', async () => {
    const adapter = { id: 'pid' };
    const factory = jest.fn(() => adapter);
    const pump = {
      id: 'pump',
      visualisation: {
        detect: () => false,
        anchorKinds: [{ kind: 'pid-node' }],
        presets: [{ id: 'pump.flow' }],
        substrates: [
          { id: 'pid', supports: [], load: async () => ({ default: factory }) },
          {
            id: 'embed',
            supports: [],
            load: async () => ({ default: factory }),
          },
        ],
      },
    } as unknown as DtaasExtension;
    const host = { logger: {} };

    const viz = createVizService(
      memoryContents().contents,
      [pump],
      () => host as never,
    );

    // The extension's own embed is not offered next to the core's.
    expect(viz.substrates.list()).toEqual(['image', 'embed', 'pid']);
    await expect(viz.substrates.get('pid')).resolves.toBe(adapter);
    expect(factory).toHaveBeenCalledWith(host);
    await expect(viz.substrates.get('aec')).rejects.toThrow('No substrate aec');
    expect(viz.anchorKinds).toHaveLength(1);
    expect(viz.presets).toHaveLength(1);
  });
});
