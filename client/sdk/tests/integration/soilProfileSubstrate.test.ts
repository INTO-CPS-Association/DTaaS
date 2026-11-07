import { waitFor } from '@testing-library/react';
import { fakeHostServices } from '@into-cps-association/dtaas-sdk/testing';
import { SCHEMES, type SignalSample } from '@into-cps-association/dtaas-sdk';
import createSoilProfileSubstrate from 'examples/soil-kit/src/dtaas/substrate/soilProfileSubstrate';
import example from 'examples/soil-kit/examples/visualisation.json';

const HOUR = 60 * 60 * 1000;
const NOW = Date.UTC(2026, 10, 7, 12, 0);
const pathOf = (device: number, quantity: string) =>
  `AUSoil/Site1/field/07/P03/S/S-AUSoil-Site1-field-07-P03-VWC-000${device}/${quantity}`;

const sample = (
  signalPath: string,
  ts: number,
  value: number,
): SignalSample => ({
  twinId: 'soil',
  signalPath,
  channel: 'measured',
  ts,
  value,
});

/** A substrate mounted as the moisture pane of the example, with its anchors. */
async function mounted(
  options: Record<string, unknown> = example.substrates.moisture.options,
) {
  const host = fakeHostServices({ extensionId: 'soil' });
  const adapter = createSoilProfileSubstrate(host);
  const container = document.createElement('div');
  document.body.append(container);
  await adapter.mount(container, { adapter: 'soil-profile', options });
  const refs = example.anchors.map((anchor) => adapter.resolve(anchor));
  return { host, adapter, container, refs };
}

const texts = (svg: Element) =>
  [...svg.querySelectorAll('text')].map((text) => text.textContent);

describe('the soil-profile substrate', () => {
  afterEach(() => document.body.replaceChildren());

  it('keeps the anchors of its quantity as rows', async () => {
    const { refs } = await mounted();
    expect(refs.filter(Boolean)).toEqual([
      { substrate: 'soil-profile', id: pathOf(1, 'soil_moisture') },
      { substrate: 'soil-profile', id: pathOf(2, 'soil_moisture') },
      { substrate: 'soil-profile', id: pathOf(3, 'soil_moisture') },
    ]);
  });

  it('takes the quantity of its first anchor when none is named', async () => {
    const { refs } = await mounted({});
    expect(refs.filter(Boolean)).toHaveLength(3);
  });

  it('draws the latest value at each depth at the playhead', async () => {
    const { host, adapter, container } = await mounted();
    host.signals.emit(sample(pathOf(2, 'soil_moisture'), NOW - HOUR, 0.31));
    adapter.setTime(NOW);
    const [latest] = container.querySelectorAll('svg');
    expect(container.querySelector('p')).toHaveTextContent(
      'Volumetric water content',
    );
    expect(texts(latest)).toEqual([
      'P03, 0.00 to 0.20 m',
      'no reading',
      'P03, 0.20 to 0.40 m',
      '31.0 %',
      'P03, 0.40 to 0.80 m',
      'no reading',
    ]);
    expect(latest.querySelectorAll('rect')).toHaveLength(4);
  });

  it('colours a depth as the encoding of the visualisation says', async () => {
    const { host, adapter, container, refs } = await mounted();
    host.signals.emit(sample(pathOf(1, 'soil_moisture'), NOW, 0.2));
    const ref = refs.find(Boolean)!;
    adapter.apply(ref, {
      encoding: { type: 'label' },
      t: NOW,
      value: 0.2,
      properties: { fill: '#123456' },
    });
    adapter.setTime(NOW);
    const row = container.querySelector(`[data-signal="${ref.id}"]`);
    expect(row?.querySelectorAll('rect')[1]).toHaveAttribute('fill', '#123456');
  });

  it('draws the heatmap of the window before the playhead', async () => {
    const { host, adapter, container } = await mounted();
    host.signals.emit(
      sample(pathOf(1, 'soil_moisture'), NOW - 2 * HOUR, 0),
      sample(pathOf(3, 'soil_moisture'), NOW - 30 * HOUR, 0.4),
    );
    adapter.setTime(NOW);
    const heatmap = container.querySelectorAll('svg')[1];
    await waitFor(() => expect(texts(heatmap)).toContain('24 h before'));
    const cells = [...heatmap.querySelectorAll('rect')].filter(
      (rect) => rect.getAttribute('width') !== '24',
    );
    expect(cells).toHaveLength(1);
    expect(cells[0]).toHaveAttribute('fill', SCHEMES.viridis[0]);
    expect(texts(heatmap)).toEqual(
      expect.arrayContaining(['0.0 %', '50.0 %', 'playhead']),
    );
  });

  it('reads the history once a minute', async () => {
    const { host, adapter } = await mounted();
    const range = jest.spyOn(host.signals, 'range');
    adapter.setTime(NOW);
    adapter.setTime(NOW + 1000);
    adapter.setTime(NOW + 60_000);
    expect(range).toHaveBeenCalledTimes(2);
  });

  it('logs a history it cannot read', async () => {
    const { host, adapter } = await mounted();
    jest.spyOn(host.signals, 'range').mockRejectedValue(new Error('down'));
    adapter.setTime(NOW);
    await waitFor(() => expect(host.recorded.logs[0]?.level).toBe('warn'));
  });

  it('draws text only in the page colour, so it reads in light and dark', async () => {
    const { host, adapter, container } = await mounted();
    host.signals.emit(sample(pathOf(1, 'soil_moisture'), NOW, 0.2));
    adapter.setTime(NOW);
    await waitFor(() =>
      expect(texts(container.querySelectorAll('svg')[1])).not.toHaveLength(0),
    );
    const fills = [...container.querySelectorAll('text')].map((t) =>
      t.getAttribute('fill'),
    );
    expect(new Set(fills)).toEqual(new Set(['currentColor']));
  });

  it('picks nothing outside its rows and leaves on dispose', async () => {
    const { adapter, container } = await mounted();
    expect(adapter.pick(0, 0)).toBeNull();
    adapter.frame({ substrate: 'soil-profile', id: 'unknown' });
    adapter.dispose();
    expect(container.childElementCount).toBe(0);
  });
});
