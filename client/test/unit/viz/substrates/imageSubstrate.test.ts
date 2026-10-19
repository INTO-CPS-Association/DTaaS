import { fakeHostServices } from '@into-cps-association/dtaas-sdk/testing';
import createImageSubstrate from 'viz/substrates/imageSubstrate';

const resolved = (properties: Record<string, unknown>) => ({
  encoding: { type: 'label' as const },
  t: 0,
  value: 12,
  properties,
});

describe('the image substrate', () => {
  const host = fakeHostServices();
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    Object.defineProperty(HTMLImageElement.prototype, 'decode', {
      configurable: true,
      value: () => Promise.resolve(),
    });
    Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', {
      configurable: true,
      get: () => 800,
    });
    Object.defineProperty(HTMLImageElement.prototype, 'naturalHeight', {
      configurable: true,
      get: () => 600,
    });
  });

  it('draws the picture with a layer sized to its own pixels', async () => {
    const adapter = createImageSubstrate(host);

    await adapter.mount(container, { adapter: 'image', source: 'photo.jpg' });

    expect(container.querySelector('img')).not.toBeNull();
    expect(container.querySelector('svg')?.getAttribute('viewBox')).toBe(
      '0 0 800 600',
    );
  });

  it('refuses a pane without a picture', async () => {
    await expect(
      createImageSubstrate(host).mount(container, { adapter: 'image' }),
    ).rejects.toThrow('needs a source');
  });

  it('colours, labels, hides and marks an anchor as its encodings say', async () => {
    const adapter = createImageSubstrate(host);
    await adapter.mount(container, { adapter: 'image', source: 'photo.jpg' });
    const ref = adapter.resolve({
      signalPath: 'j7/queue',
      kind: 'image-point',
      ref: '10,20',
    })!;
    const dot = container.querySelector('circle')!;
    const label = container.querySelector('text')!;

    adapter.apply(ref, resolved({ fill: '#ff0000', text: '12 cars' }));
    adapter.apply(ref, resolved({ attention: true, visible: false }));

    expect(dot.getAttribute('fill')).toBe('#ff0000');
    expect(label.textContent).toBe('12 cars');
    expect(dot.getAttribute('stroke-width')).toBe('6');
    expect(label.getAttribute('visibility')).toBe('hidden');
  });

  it('draws a region as a polygon and ignores anchors of other kinds', async () => {
    const adapter = createImageSubstrate(host);
    await adapter.mount(container, { adapter: 'image', source: 'photo.jpg' });

    adapter.resolve({
      signalPath: 'j7/zone',
      kind: 'image-region',
      ref: '0,0 10,0 10,10',
    });

    expect(container.querySelector('polygon')?.getAttribute('points')).toBe(
      '0,0 10,0 10,10',
    );
    expect(
      adapter.resolve({ signalPath: 'x', kind: 'ifc-guid', ref: 'abc' }),
    ).toBeNull();
  });

  it('leaves nothing behind once disposed', async () => {
    const adapter = createImageSubstrate(host);
    await adapter.mount(container, { adapter: 'image', source: 'photo.jpg' });

    adapter.dispose();

    expect(container.childElementCount).toBe(0);
  });
});
