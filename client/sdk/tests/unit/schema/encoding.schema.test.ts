import { encodingSchema } from 'src/schema/encoding.schema';

const comparison = { op: '>', value: 30 };

describe('encodingSchema', () => {
  it.each([
    { type: 'colorScale', domain: [0, 40], scheme: 'viridis' },
    { type: 'visibility', when: comparison },
    {
      type: 'transform',
      property: 'rotate',
      axis: 'z',
      domain: [0, 100],
      range: [0, 360],
    },
    { type: 'flow', speedDomain: [0, 5] },
    { type: 'residual', against: 'simulated', domain: [-8, 8] },
    { type: 'ghost', channel: 'predicted', opacity: 0.4 },
    { type: 'label', unit: '°C', precision: 1 },
    { type: 'attention', when: comparison, priority: 'high' },
    { type: 'glyph', shape: 'circle', sizeDomain: [0, 10] },
    { type: 'regionFill', domain: [0, 40], scheme: 'traffic' },
    {
      type: 'fieldOverlay',
      kernel: 'bim.flood-fill',
      domain: [18, 26],
      scheme: 'thermal',
    },
    { type: 'trajectory', windowMs: 60000 },
  ])('accepts a $type encoding', (encoding) => {
    expect(encodingSchema.safeParse(encoding).success).toBe(true);
  });

  it('rejects an unknown encoding type', () => {
    expect(encodingSchema.safeParse({ type: 'sparkle' }).success).toBe(false);
  });

  it('requires a domain of exactly two numbers', () => {
    const encoding = { type: 'colorScale', domain: [0], scheme: 'viridis' };
    expect(encodingSchema.safeParse(encoding).success).toBe(false);
  });

  it('rejects a residual against an unknown channel', () => {
    const encoding = { type: 'residual', against: 'guessed', domain: [0, 1] };
    expect(encodingSchema.safeParse(encoding).success).toBe(false);
  });

  it('rejects a ghost opacity above 1', () => {
    const encoding = { type: 'ghost', channel: 'simulated', opacity: 1.5 };
    expect(encodingSchema.safeParse(encoding).success).toBe(false);
  });
});
