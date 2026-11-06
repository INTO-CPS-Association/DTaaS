import { anchorSchema } from 'src/schema/anchor.schema';

describe('anchorSchema', () => {
  it('accepts a standard anchor kind', () => {
    const anchor = { signalPath: 'a/b', kind: 'ifc-guid', ref: '3x9$Fa' };
    expect(anchorSchema.safeParse(anchor).success).toBe(true);
  });

  it('accepts a domain anchor kind', () => {
    const anchor = {
      signalPath: 'wt1/rpm',
      kind: 'turbine',
      ref: 'wt1/nacelle',
    };
    expect(anchorSchema.safeParse(anchor).success).toBe(true);
  });

  it.each(['signalPath', 'kind', 'ref'])('requires a non-empty %s', (key) => {
    const anchor = { signalPath: 'a', kind: 'k', ref: 'r', [key]: '' };
    expect(anchorSchema.safeParse(anchor).success).toBe(false);
  });
});
