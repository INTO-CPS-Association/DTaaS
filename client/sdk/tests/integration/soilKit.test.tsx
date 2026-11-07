import { act, screen } from '@testing-library/react';
import {
  checkConformance,
  fakeHostServices,
  renderWithHost,
} from '@into-cps-association/dtaas-sdk/testing';
import {
  validateExtension,
  type VisualisationAsset,
} from '@into-cps-association/dtaas-sdk';
import { parseVisualisationAsset } from '@into-cps-association/dtaas-sdk/schema';
import extension from 'examples/soil-kit/src/dtaas';
import SoilPage from 'examples/soil-kit/src/dtaas/pages/SoilPage';
import { twinSummary } from 'examples/soil-kit/src/dtaas/pages/useSoilTwin';
import example from 'examples/soil-kit/examples/visualisation.json';

const env = { REACT_APP_EXT_SOIL_TWIN: 'soil_p03' };
const asset = parseVisualisationAsset(example);

function exampleAsset(): VisualisationAsset {
  if (!asset.success) throw new Error('The example is not a valid asset');
  return asset.data;
}
const DEVICE = 'S-AUSoil-Site1-field-07-P03-VWC-0002';
const MOISTURE = `AUSoil/Site1/field/07/P03/S/${DEVICE}/soil_moisture`;

/** A host whose library holds the example visualisation of the soil twin. */
async function hostWithTwin() {
  const host = fakeHostServices({ extensionId: 'soil', env });
  await host.viz.save(twinSummary(host, 'soil_p03'), exampleAsset());
  return host;
}

describe('soil-kit', () => {
  it('has a valid example visualisation', () => {
    expect(asset.success).toBe(true);
  });

  it('passes static validation', () => {
    expect(validateExtension(extension)).toEqual({ valid: true, errors: [] });
  });

  it('passes the conformance harness', async () => {
    const host = fakeHostServices({ extensionId: 'soil', env });
    await expect(checkConformance(extension, { host })).resolves.toEqual({
      passed: true,
      errors: [],
    });
    expect(host.recorded.logs).toContainEqual({
      level: 'info',
      args: ['soil-kit ready'],
    });
  });

  it('fails conformance without the twin it shows', async () => {
    const report = await checkConformance(extension);
    expect(report.errors[0]).toMatch(
      /^setup\(\) failed: Invalid configuration for extension "soil"/,
    );
  });

  it('claims twins of the soil domain only', async () => {
    const detect = extension.visualisation?.detect;
    const twin = (domain?: string) => ({
      name: 't',
      path: 'p',
      files: [],
      domain,
    });
    expect(await detect?.(twin('soil'))).toBe(true);
    expect(await detect?.(twin('bim'))).toBe(false);
    expect(await detect?.(twin())).toBe(false);
  });

  it('resolves soil-depth anchors on its own substrate only', () => {
    const [kind] = extension.visualisation?.anchorKinds ?? [];
    const anchor = {
      signalPath: MOISTURE,
      kind: 'soil-depth',
      ref: 'P03/0.20-0.40',
    };
    type Adapter = Parameters<typeof kind.resolve>[1];
    const resolve = jest.fn(() => null);
    const profile = { id: 'soil-profile', resolve } as unknown as Adapter;
    expect(kind.validateRef?.('P03/0.20-0.40')).toBe(true);
    expect(kind.validateRef?.('P03/0.40-0.20')).toBe(false);
    kind.resolve(anchor, profile);
    expect(resolve).toHaveBeenCalledWith(anchor);
    const image = { id: 'image' } as Adapter;
    expect(kind.resolve(anchor, image)).toBeNull();
  });

  it('offers colour presets for its substrate', () => {
    const presets = extension.visualisation?.presets ?? [];
    expect(presets.map((p) => [p.id, p.substrate])).toEqual([
      ['soil.moisture', 'soil-profile'],
      ['soil.temperature', 'soil-profile'],
    ]);
  });
});

describe('the soil page', () => {
  it('lists the profiles and the reading of each sensor at the playhead', async () => {
    const host = await hostWithTwin();
    host.signals.emit(
      {
        twinId: 'soil',
        signalPath: MOISTURE,
        channel: 'measured',
        ts: 1000,
        value: 0.312,
      },
      {
        twinId: 'soil',
        signalPath: MOISTURE,
        channel: 'measured',
        ts: 2000,
        value: 0.25,
      },
    );
    host.signals.playhead.set(1500);
    renderWithHost(<SoilPage />, { host });
    expect(
      await screen.findByRole('heading', { name: 'Profile P03' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(10);
    expect(screen.getByText('31.2 %')).toBeInTheDocument();
    expect(screen.getAllByText('no reading')).toHaveLength(8);
    act(() => host.signals.playhead.set(2000));
    expect(screen.getByText('25.0 %')).toBeInTheDocument();
  });

  it('shows a reading that arrives while it is open', async () => {
    const host = await hostWithTwin();
    host.signals.playhead.follow(true);
    renderWithHost(<SoilPage />, { host });
    await screen.findByRole('heading', { name: 'Profile P03' });
    act(() =>
      host.signals.emit({
        twinId: 'soil',
        signalPath: MOISTURE,
        channel: 'measured',
        ts: Date.now() - 1000,
        value: 0.2,
      }),
    );
    expect(screen.getByText('20.0 %')).toBeInTheDocument();
  });

  it('says so when the twin has no visualisation', async () => {
    const host = fakeHostServices({ extensionId: 'soil', env });
    renderWithHost(<SoilPage />, { host });
    expect(await screen.findByRole('status')).toHaveTextContent(
      'No visualisation.json in digital_twins/soil_p03.',
    );
  });

  it('says so when the twin has no soil anchors', async () => {
    const host = fakeHostServices({ extensionId: 'soil', env });
    const empty: VisualisationAsset = { ...exampleAsset(), anchors: [] };
    await host.viz.save(twinSummary(host, 'soil_p03'), empty);
    renderWithHost(<SoilPage />, { host });
    expect(await screen.findByRole('status')).toHaveTextContent(
      'has no soil-depth anchors.',
    );
  });

  it('reports a twin it cannot read', async () => {
    const host = fakeHostServices({ extensionId: 'soil', env });
    jest.spyOn(host.viz, 'load').mockRejectedValue(new Error('Forbidden'));
    renderWithHost(<SoilPage />, { host });
    expect(await screen.findByRole('status')).toHaveTextContent('Forbidden');
  });
});
