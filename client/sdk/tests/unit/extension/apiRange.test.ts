import { isApiRange, satisfiesApiRange } from 'src/extension/apiRange';
import { API_VERSION } from 'src/extension/constants';
import validateExtension from 'src/extension/validateExtension';
import { looseExtension } from 'tests/fixtures/extensions';

describe('satisfiesApiRange', () => {
  it.each([
    ['1.1.0', '1.1.0'],
    ['1.1.0', '1.1'],
    ['1.1.9', '1.1'],
    ['1.4.2', '^1.1'],
    ['1.1.9', '~1.1'],
    ['0.3.5', '^0.3.1'],
    ['1.1.0', '>=1.0 <2'],
    ['2.0.0', '^1.1 || ^2'],
    ['1.0.0', '<=1.0.0'],
    ['1.2.0', '>1.1.9'],
    ['0.2.0', '^0.2'],
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
    ['0.3.0', '^0.2'],
    ['not a version', '^1'],
    ['1.0.0', ''],
  ])('puts %s outside %s', (version, range) => {
    expect(satisfiesApiRange(version, range)).toBe(false);
  });

  // The cases where a hand-written reader of the range syntax gave another
  // answer than npm, which reads the same range in `peerDependencies`.
  it.each([
    ['1.5.0', '~1', true],
    ['1.0.5', '<=1.0', true],
    ['0.0.5', '^0.0.3', false],
    ['1.1.5', '1.1', true],
  ])('reads %s against %s as npm does', (version, range, inside) => {
    expect(satisfiesApiRange(version, range)).toBe(inside);
  });
});

describe('isApiRange', () => {
  it.each(['1', '^1.1', '~1.1.0', '>=1.0 <2', '^1 || ^2', '1.x', '*'])(
    'accepts %p',
    (range) => expect(isApiRange(range)).toBe(true),
  );

  it.each(['', '   ', 'latest', '^1.2.3.4', '>=1 <2 garbage', 1, null])(
    'refuses %p',
    (range) => expect(isApiRange(range)).toBe(false),
  );

  it('refuses a range longer than a person would write', () => {
    expect(isApiRange(`^1 ${'|| ^1 '.repeat(60)}`)).toBe(false);
  });
});

describe('validateExtension and the API range (K1)', () => {
  const withRange = (apiRange: unknown) => ({ ...looseExtension(), apiRange });

  it('accepts an extension whose range includes the host API', () => {
    expect(validateExtension(withRange(`^${API_VERSION}`)).errors).toEqual([]);
  });

  it('accepts an extension that declares no range', () => {
    expect(validateExtension(looseExtension()).errors).toEqual([]);
  });

  it('refuses an extension built for a later API than the host has', () => {
    const result = validateExtension(withRange('^0.3'), {
      hostApiVersion: '0.2.0',
    });
    expect(result).toEqual({
      valid: false,
      errors: ['apiRange "^0.3" does not include this host\'s API 0.2.0'],
    });
  });

  it('refuses an extension built for another major', () => {
    expect(validateExtension(withRange('^2')).valid).toBe(false);
  });

  it('refuses a range it cannot read', () => {
    expect(validateExtension(withRange('latest')).errors).toEqual([
      'apiRange must be a version range such as "^0.2"',
    ]);
  });
});
