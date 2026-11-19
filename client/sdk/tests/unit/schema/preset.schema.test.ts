import { encodingPresetSchema } from 'src/schema/preset.schema';

const preset = {
  id: 'bim.thermal-comfort',
  label: 'Thermal comfort per room',
  substrate: 'aec',
  encodings: [
    {
      target: 'building/*/temperature',
      encoding: { type: 'colorScale', domain: [18, 26], scheme: 'thermal' },
    },
  ],
};

describe('encodingPresetSchema', () => {
  it('accepts a namespaced preset', () => {
    expect(encodingPresetSchema.safeParse(preset).success).toBe(true);
  });

  it.each(['Bim.Thermal', 'bim thermal', '.bim', ''])(
    'rejects the preset id %p',
    (id) => {
      expect(encodingPresetSchema.safeParse({ ...preset, id }).success).toBe(
        false,
      );
    },
  );

  it('requires at least one encoding', () => {
    const empty = { ...preset, encodings: [] };
    expect(encodingPresetSchema.safeParse(empty).success).toBe(false);
  });

  it('rejects an invalid encoding inside the preset', () => {
    const bad = {
      ...preset,
      encodings: [{ target: 'x', encoding: { type: 'sparkle' } }],
    };
    expect(encodingPresetSchema.safeParse(bad).success).toBe(false);
  });
});
