import { fakeHostServices } from '@into-cps-association/dtaas-sdk/testing';
import {
  parseVisualisationAsset,
  visualisationAssetSchema,
} from '@into-cps-association/dtaas-sdk/schema';
import type { DigitalTwinSummary } from '@into-cps-association/dtaas-sdk';
import junction7 from 'tests/fixtures/junction7.visualisation.json';

const dt: DigitalTwinSummary = {
  name: 'junction7',
  path: 'digital_twins/junction7',
  files: ['visualisation.json'],
};

describe('visualisation.json as a library asset (R7)', () => {
  it('round-trips through the viz service', async () => {
    const host = fakeHostServices();
    const asset = visualisationAssetSchema.parse(junction7);
    await host.viz.save(dt, asset);
    await expect(host.viz.load(dt)).resolves.toEqual(asset);
  });

  it('round-trips through a git commit as JSON', async () => {
    const host = fakeHostServices();
    const json = JSON.stringify(
      visualisationAssetSchema.parse(junction7),
      null,
      2,
    );
    await host.git.commit(
      'dtaas/junction7',
      'raise-threshold',
      [{ action: 'update', path: 'visualisation.json', content: json }],
      'Raise queue threshold',
    );
    const bytes = await host.git.read(
      'dtaas/junction7',
      'visualisation.json',
      'raise-threshold',
    );
    const reparsed = parseVisualisationAsset(
      JSON.parse(new TextDecoder().decode(bytes)),
    );
    expect(reparsed.success && reparsed.data.name).toBe('junction-7-live');
  });

  it('swapping the photograph and homography keeps the asset valid', () => {
    const reused = JSON.parse(JSON.stringify(junction7));
    reused.substrates.photo.source = 'git://twins/junction9/junction9.jpg';
    reused.substrates.photo.calibration.id = 'h9';
    reused.anchors[0].homographyId = 'h9';
    expect(parseVisualisationAsset(reused).success).toBe(true);
  });
});
