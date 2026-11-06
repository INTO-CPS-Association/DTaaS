import createFakeViz, { type RecordedSave } from 'src/testing/fakeViz';
import junction7 from 'tests/fixtures/junction7.visualisation.json';
import { visualisationAssetSchema } from 'src/schema';
import type { DigitalTwinSummary, SubstrateAdapter } from 'src/index';

const dt: DigitalTwinSummary = {
  name: 'j7',
  path: 'digital_twins/j7',
  files: [],
};
const asset = visualisationAssetSchema.parse(junction7);

describe('createFakeViz', () => {
  it('returns null for a twin without an asset', async () => {
    await expect(createFakeViz().load(dt)).resolves.toBeNull();
  });

  it('round-trips a saved asset and records the save', async () => {
    const saved: RecordedSave[] = [];
    const viz = createFakeViz({}, saved);
    await viz.save(dt, asset, { viaMergeRequest: true });
    await expect(viz.load(dt)).resolves.toEqual(asset);
    expect(saved).toEqual([{ dt, asset, options: { viaMergeRequest: true } }]);
  });

  it('refuses to save an invalid asset', async () => {
    const viz = createFakeViz();
    const broken = { ...asset, layout: { type: 'single', panes: ['nowhere'] } };
    await expect(viz.save(dt, broken as typeof asset)).rejects.toThrow(
      'Invalid visualisation asset',
    );
  });

  it('serves registered substrate adapters', async () => {
    const image = { id: 'image' } as SubstrateAdapter;
    const viz = createFakeViz({ substrates: { image } });
    expect(viz.substrates.list()).toEqual(['image']);
    await expect(viz.substrates.get('image')).resolves.toBe(image);
    await expect(viz.substrates.get('aec')).rejects.toThrow(
      'Unknown substrate: aec',
    );
  });

  it('exposes merged anchor kinds and presets', () => {
    const viz = createFakeViz({ anchorKinds: [], presets: [] });
    expect([viz.anchorKinds, viz.presets]).toEqual([[], []]);
  });
});
