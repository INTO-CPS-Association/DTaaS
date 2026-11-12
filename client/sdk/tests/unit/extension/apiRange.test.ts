import { isApiRange, satisfiesApiRange } from 'src/extension/apiRange';
import { SDK_VERSION } from 'src/extension/constants';
import validateExtension from 'src/extension/validateExtension';
import { looseExtension } from 'tests/fixtures/extensions';

describe('satisfiesApiRange', () => {
  it.each([
    ['1.1.0', '1.1.0'],
    ['1.1.0', '1.1'],
    ['1.4.2', '^1.1'],
    ['1.1.9', '~1.1'],
    ['0.3.5', '^0.3.1'],
    ['1.1.0', '>=1.0 <2'],
    ['2.0.0', '^1.1 || ^2'],
    ['1.0.0', '<=1.0.0'],
    ['1.2.0', '>1.1.9'],
  ])('puts %s inside %s', (version, range) => {
    expect(satisfiesApiRange(version, range)).toBe(true);
  });

  it.each([
    ['2.0.0', '^1.1'],
    ['1.0.9', '^1.1'],
    ['1.2.0', '~1.1'],
    ['0.4.0', '^0.3.1'],
    ['2.0.0', '>=1.0 <2'],
    ['1.1.0', '1.1.1'],
    ['not a version', '^1'],
  ])('puts %s outside %s', (version, range) => {
    expect(satisfiesApiRange(version, range)).toBe(false);
  });
});

describe('isApiRange', () => {
  it.each(['1', '^1.1', '~1.1.0', '>=1.0 <2', '^1 || ^2'])(
    'accepts %p',
    (range) => expect(isApiRange(range)).toBe(true),
  );

  it.each(['', 'latest', '^1.x', '1.0.0-beta', '>=1 ||', '^1.2.3.4', 1])(
    'refuses %p',
    (range) => expect(isApiRange(range)).toBe(false),
  );
});

describe('validateExtension and the API range (K1)', () => {
  const withRange = (apiRange: unknown) => ({ ...looseExtension(), apiRange });

  it('accepts an extension whose range includes the host API', () => {
    expect(validateExtension(withRange(`^${SDK_VERSION}`)).errors).toEqual([]);
  });

  it('accepts an extension that declares no range', () => {
    expect(validateExtension(looseExtension()).errors).toEqual([]);
  });

  it('refuses an extension built for a later API than the host has', () => {
    const result = validateExtension(withRange('^1.2'), {
      hostApiVersion: '1.1.0',
    });
    expect(result).toEqual({
      valid: false,
      errors: ['apiRange "^1.2" does not include this host\'s API 1.1.0'],
    });
  });

  it('refuses an extension built for another major', () => {
    expect(validateExtension(withRange('^2')).valid).toBe(false);
  });

  it('refuses a range it cannot read', () => {
    expect(validateExtension(withRange('latest')).errors).toEqual([
      'apiRange must be a version range such as "^1.1"',
    ]);
  });
});
