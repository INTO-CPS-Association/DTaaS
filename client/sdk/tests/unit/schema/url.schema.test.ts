// These tests feed script URLs to the schema to check that it refuses them.
/* eslint-disable no-script-url */
import { urlSchema } from 'src/schema/url.schema';

const absoluteOnly = urlSchema({ schemes: ['https'] });
const withPaths = urlSchema({ schemes: ['https'], relative: true });

const accepts = (schema: typeof absoluteOnly, value: string) =>
  schema.safeParse(value).success;

describe('urlSchema', () => {
  it('accepts a listed scheme in any case', () => {
    expect(accepts(absoluteOnly, 'https://a.example/x')).toBe(true);
    expect(accepts(absoluteOnly, 'HTTPS://a.example/x')).toBe(true);
  });

  it.each([
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    ' javascript:alert(1)',
    'java\tscript:alert(1)',
    'java\nscript:alert(1)',
    '\u0000javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
    'http://a.example/x',
  ])('refuses %j when only https is allowed', (value) => {
    expect(accepts(withPaths, value)).toBe(false);
  });

  it.each(['data/run.csv', './run.csv', '/lib/a.jpg', 'data/run.csv?q=..'])(
    'accepts the relative path %j when paths are allowed',
    (value) => {
      expect(accepts(withPaths, value)).toBe(true);
    },
  );

  describe('with the paths the host resolves', () => {
    const hostPaths = urlSchema({
      schemes: ['lib', 'git', 'https'],
      relative: true,
    });

    it.each([
      '../models/a.ifc',
      '../../other-twin/secret.ifc',
      'models/../../x.ifc',
      'models\\..\\x.ifc',
      'models/%2e%2e/x.ifc',
      'models/.%2E/x.ifc',
      'lib:../../x',
      'lib://common/../../x',
      'git://twins/a/../../b',
    ])('refuses %j, which climbs out of its folder', (value) => {
      const result = hostPaths.safeParse(value);
      expect(result.error?.issues.map((i) => i.message)).toEqual([
        'A path the host resolves must not contain a ".." segment',
      ]);
    });

    it.each([
      'lib://common/models/a.ifc',
      'models/a..b.ifc',
      'https://a.example/x/../y',
    ])('accepts %j', (value) => {
      expect(accepts(hostPaths, value)).toBe(true);
    });
  });

  it('refuses a relative path when paths are not allowed', () => {
    expect(accepts(absoluteOnly, 'data/run.csv')).toBe(false);
  });

  it.each(['//evil.example/a', '\\\\evil.example/a', '/\\evil.example/a'])(
    'refuses %j, which names another host',
    (value) => {
      expect(accepts(withPaths, value)).toBe(false);
    },
  );

  it('refuses an empty string and a malformed URL', () => {
    expect(accepts(withPaths, '')).toBe(false);
    expect(accepts(withPaths, 'https://[')).toBe(false);
  });

  it('refuses a URL longer than 2048 characters', () => {
    const long = `https://a.example/${'a'.repeat(2048)}`;
    expect(accepts(absoluteOnly, long)).toBe(false);
  });

  it.each([
    'https://user:secret@a.example/x',
    'https://user@a.example/x',
    'https://:secret@a.example/x',
    'HTTPS://user:secret@a.example/x',
  ])('refuses %j, which carries credentials', (value) => {
    expect(accepts(withPaths, value)).toBe(false);
  });

  it('accepts an @ in the path, which is not a credential', () => {
    expect(accepts(withPaths, 'https://a.example/team@x/run.csv')).toBe(true);
    expect(accepts(withPaths, 'data/team@x/run.csv')).toBe(true);
  });

  it('says why a URL with credentials is refused', () => {
    const result = absoluteOnly.safeParse('https://user:secret@a.example/x');
    expect(result.error?.issues.map((i) => i.message)).toEqual([
      'A URL must not carry a user name or password. The host keeps credentials',
    ]);
  });

  it('names the allowed schemes in the error', () => {
    const result = withPaths.safeParse('javascript:alert(1)');
    expect(result.error?.issues[0].message).toBe(
      'Expected a URL with scheme https: or a relative path',
    );
  });
});
