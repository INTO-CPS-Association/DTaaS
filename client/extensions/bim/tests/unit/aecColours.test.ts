import type { Encoding } from '@into-cps-association/dtaas-sdk';
import { MarkerColours } from 'src/aec/aecColours';

const scale = (scheme: string, domain: [number, number]): Encoding => ({
  type: 'colorScale',
  scheme,
  domain,
});

const warm = scale('heat', [18, 30]);
const air = scale('viridis', [400, 1200]);

describe('the marker colours of the aec substrate', () => {
  it('shows the latest colour of a marker until the heatmap is off', () => {
    const colours = new MarkerColours();
    expect(colours.record('a', warm, '#f00')).toBe(true);
    expect(colours.record('a', warm, '#0f0')).toBe(false);
    expect(colours.colourOf('a')).toBe('#0f0');
    colours.cycle();
    expect(colours.mode).toBe('off');
    expect(colours.colourOf('a')).toBeUndefined();
    expect(colours.shown()).toEqual([]);
    colours.cycle();
    expect(colours.badge()).toBe('All');
  });

  it('shows one colour rule at a time when there are several', () => {
    const colours = new MarkerColours();
    colours.record('a', warm, '#f00');
    colours.record('a', air, '#00f');
    colours.record('b', warm, '#ff0');
    expect(colours.colourOf('a')).toBe('#00f');
    colours.cycle();
    expect(colours.badge()).toBe('heat 18 to 30');
    expect(colours.colourOf('a')).toBe('#f00');
    expect(colours.shown()).toEqual([
      { key: 'heat 18 to 30', scheme: 'heat', domain: [18, 30] },
    ]);
    expect(colours.countOf(colours.quantities[0])).toBe(2);
    colours.cycle();
    expect(colours.colourOf('b')).toBeUndefined();
    colours.cycle();
    expect(colours.badge()).toBe('Off');
    colours.reset();
    expect(colours.mode).toBe('all');
  });

  it('names a colour rule without a scale by its type', () => {
    const colours = new MarkerColours();
    colours.record('a', { type: 'attention' } as Encoding, '#f00');
    expect(colours.quantities[0].key).toBe('attention');
  });
});
