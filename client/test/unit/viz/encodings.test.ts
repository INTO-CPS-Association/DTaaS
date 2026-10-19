import type {
  Channel,
  Encoding,
  SignalValue,
} from '@into-cps-association/dtaas-sdk';
import evaluate from 'viz/encodings';
import { colourAt, position } from 'viz/schemes';

const values =
  (byChannel: Partial<Record<Channel, SignalValue>>) => (channel: Channel) =>
    byChannel[channel];

describe('the colour schemes', () => {
  it('maps a value into its domain, clamped', () => {
    expect(position(5, [0, 10])).toBe(0.5);
    expect(position(-3, [0, 10])).toBe(0);
    expect(position(30, [0, 10])).toBe(1);
    expect(position(1, [2, 2])).toBe(0);
  });

  it('takes the end stops at the ends and falls back to heat', () => {
    expect(colourAt('traffic', 0)).toBe('#1a9641');
    expect(colourAt('traffic', 1)).toBe('#d7191c');
    expect(colourAt('no-such-scheme', 0)).toBe(colourAt('heat', 0));
  });
});

describe('the encoding evaluators', () => {
  it('colours a value along its scale, and leaves a missing value uncoloured', () => {
    const encoding: Encoding = {
      type: 'colorScale',
      domain: [0, 40],
      scheme: 'traffic',
    };

    expect(evaluate(encoding, values({ measured: 40 }))).toEqual({
      color: '#d7191c',
    });
    expect(evaluate(encoding, values({}))).toEqual({ color: undefined });
  });

  it('shows the residual between measured and simulated', () => {
    const encoding: Encoding = {
      type: 'residual',
      against: 'simulated',
      domain: [-8, 8],
    };

    const properties = evaluate(
      encoding,
      values({ measured: 12, simulated: 4 }),
    );

    expect(properties.residual).toBe(8);
    expect(properties.color).toBe(colourAt('diverging', 1));
  });

  it('decides visibility and attention by comparison', () => {
    const when = { op: '>' as const, value: 30 };

    expect(
      evaluate({ type: 'visibility', when }, values({ measured: 31 })),
    ).toEqual({ visible: true });
    expect(
      evaluate(
        { type: 'attention', when, priority: 'high' },
        values({ measured: 31 }),
      ),
    ).toEqual({ attention: 'high' });
    expect(
      evaluate({ type: 'attention', when }, values({ measured: 2 })),
    ).toEqual({ attention: null });
  });

  it('formats a label and maps a transform', () => {
    expect(
      evaluate(
        { type: 'label', precision: 2, unit: '°C' },
        values({ measured: 21.456 }),
      ),
    ).toEqual({ text: '21.46 °C' });
    expect(
      evaluate(
        {
          type: 'transform',
          property: 'rotate',
          axis: 'z',
          domain: [0, 10],
          range: [0, 90],
        },
        values({ measured: 5 }),
      ),
    ).toEqual({ rotate: { axis: 'z', amount: 45 } });
  });

  it('draws nothing for a type the core does not draw yet', () => {
    expect(
      evaluate({ type: 'trajectory', windowMs: 1000 }, values({})),
    ).toEqual({});
  });
});
