import { fakeHostServices } from '@into-cps-association/dtaas-sdk/testing';
import createEmbedSubstrate, {
  embedUrl,
  sandboxFor,
} from 'viz/substrates/embedSubstrate';

const BASE = 'https://grafana.example/d/abc?orgId=1';
const grafana = {
  adapter: 'embed',
  source: BASE,
  timeParams: ['from', 'to'] as [string, string],
};
const NOW = 1_700_000_000_000;

describe('the embed substrate', () => {
  it('leaves the address alone when the tool takes no time range', () => {
    expect(embedUrl(BASE, { adapter: 'embed' }, NOW, NOW)).toBe(BASE);
  });

  it('asks for a range relative to now while the playhead is live', () => {
    const url = new URL(embedUrl(BASE, grafana, NOW, NOW));

    expect(url.searchParams.get('from')).toBe('now-3600s');
    expect(url.searchParams.get('to')).toBe('now');
    expect(url.searchParams.get('orgId')).toBe('1');
  });

  it('asks for an absolute range ending at a scrubbed playhead', () => {
    const t = NOW - 600_000;
    const url = new URL(
      embedUrl(BASE, { ...grafana, options: { windowMs: 60_000 } }, t, NOW),
    );

    expect(url.searchParams.get('from')).toBe(String(t - 60_000));
    expect(url.searchParams.get('to')).toBe(String(t));
  });

  it('shows the page in a frame that follows the playhead', async () => {
    const container = document.createElement('div');
    const adapter = createEmbedSubstrate(fakeHostServices());

    await adapter.mount(container, grafana);
    const frame = container.querySelector('iframe')!;
    adapter.setTime(NOW - 600_000);

    expect(frame.title).toBe('Embedded dashboard');
    expect(frame.referrerPolicy).toBe('no-referrer');
    expect(frame.getAttribute('sandbox')).toBe(sandboxFor(BASE));
    expect(new URL(frame.src).searchParams.get('to')).toBe(
      String(NOW - 600_000),
    );
    adapter.dispose();
    expect(container.childElementCount).toBe(0);
  });

  it('lets a page of another origin keep its origin', () => {
    expect(sandboxFor(BASE)).toBe(
      'allow-scripts allow-same-origin allow-forms allow-popups',
    );
  });

  it('runs a library file of the DTaaS origin in an opaque origin', async () => {
    const host = fakeHostServices();
    const local = `${globalThis.location.origin}/user1/files/dash.html`;
    jest.spyOn(host.library, 'resolve').mockResolvedValue(local);
    const container = document.createElement('div');

    await createEmbedSubstrate(host).mount(container, {
      adapter: 'embed',
      source: 'lib://dash.html',
    });

    expect(sandboxFor(local)).toBe('allow-scripts');
    expect(container.querySelector('iframe')?.getAttribute('sandbox')).toBe(
      'allow-scripts',
    );
  });

  it('runs a library file in an opaque origin even on another origin', async () => {
    const host = fakeHostServices();
    const elsewhere = 'https://workspace.example/user1/files/dash.html';
    jest.spyOn(host.library, 'resolve').mockResolvedValue(elsewhere);
    const container = document.createElement('div');

    await createEmbedSubstrate(host).mount(container, {
      adapter: 'embed',
      source: 'lib://dash.html',
    });

    expect(container.querySelector('iframe')?.getAttribute('sandbox')).toBe(
      'allow-scripts',
    );
  });

  it('has no anchors to resolve, paint, frame or pick', () => {
    const adapter = createEmbedSubstrate(fakeHostServices());
    const ref = { substrate: 'embed', id: 'x' };

    expect(
      adapter.resolve({ signalPath: 'x', kind: 'geo', ref: '' }),
    ).toBeNull();
    expect(
      adapter.apply(ref, {
        encoding: { type: 'label' },
        t: 0,
        value: 1,
        properties: {},
      }),
    ).toBeUndefined();
    expect(adapter.frame(ref)).toBeUndefined();
    expect(adapter.pick(0, 0)).toBeNull();
  });

  it('refuses a pane without an address', async () => {
    await expect(
      createEmbedSubstrate(fakeHostServices()).mount(
        document.createElement('div'),
        { adapter: 'embed' },
      ),
    ).rejects.toThrow('needs a source');
  });
});
