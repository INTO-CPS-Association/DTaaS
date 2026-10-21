import { fakeHostServices } from '@into-cps-association/dtaas-sdk/testing';
import { SCHEMES } from 'viz/schemes';
import createImageSubstrate, { altText } from 'viz/substrates/imageSubstrate';

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

    expect(container.querySelector('img')?.alt).toBe(
      'Picture photo.jpg, with the signals of this twin drawn on it',
    );
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
    expect(dot.getAttribute('stroke')).toBe(SCHEMES.heat[4]);
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

  it('names the picture by its file in the alternative text', () => {
    expect(altText('lib://sites/j7/photo.jpg?v=2')).toBe(
      'Picture photo.jpg, with the signals of this twin drawn on it',
    );
  });

  it('scrolls an anchor into view, and has no picking or time of its own', async () => {
    const adapter = createImageSubstrate(host);
    await adapter.mount(container, { adapter: 'image', source: 'photo.jpg' });
    const ref = adapter.resolve({
      signalPath: 'j7/queue',
      kind: 'image-point',
      ref: '10,20',
    })!;
    const scroll = jest.fn();
    container.querySelector('circle')!.scrollIntoView = scroll;

    adapter.frame(ref);

    expect(scroll).toHaveBeenCalledWith({ block: 'center' });
    expect(adapter.pick(0, 0)).toBeNull();
    expect(adapter.setTime(0)).toBeUndefined();
  });

  it('leaves nothing behind once disposed', async () => {
    const adapter = createImageSubstrate(host);
    await adapter.mount(container, { adapter: 'image', source: 'photo.jpg' });

    adapter.dispose();

    expect(container.childElementCount).toBe(0);
  });
});
