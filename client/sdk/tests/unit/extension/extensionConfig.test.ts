import { z } from 'zod';
import {
  envPrefix,
  isExtensionDisabled,
  readExtensionConfig,
} from 'src/extension/extensionConfig';

const schema = z.object({
  scadaUrl: z.string(),
  refreshMs: z.coerce.number().default(1000),
});

describe('envPrefix', () => {
  it.each([
    ['wind', 'REACT_APP_EXT_WIND_'],
    ['my-kit', 'REACT_APP_EXT_MY_KIT_'],
  ])('maps %s to %s', (id, prefix) => {
    expect(envPrefix(id)).toBe(prefix);
  });
});

describe('readExtensionConfig', () => {
  it('strips the prefix and camel-cases the keys', () => {
    const env = { REACT_APP_EXT_WIND_SCADA_URL: 'https://scada' };
    const result = readExtensionConfig('wind', schema, env);
    expect(result.success && result.data).toEqual({
      scadaUrl: 'https://scada',
      refreshMs: 1000,
    });
  });

  it('ignores keys of other extensions and of the host', () => {
    const env = {
      REACT_APP_EXT_WIND_SCADA_URL: 'https://scada',
      REACT_APP_EXT_PUMP_SCADA_URL: 'https://pump',
      REACT_APP_URL: 'https://dtaas',
    };
    const result = readExtensionConfig(
      'wind',
      z.record(z.string(), z.string()),
      env,
    );
    expect(result.success && result.data).toEqual({
      scadaUrl: 'https://scada',
    });
  });

  it('reads hyphenated ids', () => {
    const env = {
      REACT_APP_EXT_MY_KIT_SCADA_URL: 'x',
      REACT_APP_EXT_MY_KIT_REFRESH_MS: '50',
    };
    const result = readExtensionConfig('my-kit', schema, env);
    expect(result.success && result.data).toEqual({
      scadaUrl: 'x',
      refreshMs: 50,
    });
  });

  it('reports schema failures without throwing', () => {
    const result = readExtensionConfig('wind', schema, {});
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['scadaUrl']);
  });
});

describe('isExtensionDisabled', () => {
  it.each(['wind, pump', 'wind,pump', ' pump  wind '])(
    'finds wind in %p',
    (list) => {
      expect(
        isExtensionDisabled('wind', { REACT_APP_EXTENSIONS_DISABLED: list }),
      ).toBe(true);
    },
  );

  it('does not match on a prefix', () => {
    const env = { REACT_APP_EXTENSIONS_DISABLED: 'wind-farm' };
    expect(isExtensionDisabled('wind', env)).toBe(false);
  });

  it.each([{}, { REACT_APP_EXTENSIONS_DISABLED: 42 }])(
    'treats %p as nothing disabled',
    (env) => {
      expect(isExtensionDisabled('wind', env)).toBe(false);
    },
  );
});
