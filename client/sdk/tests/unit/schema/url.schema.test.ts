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

  it.each(['data/run.csv', './run.csv', '../models/a.ifc', '/lib/a.jpg'])(
    'accepts the relative path %j when paths are allowed',
    (value) => {
      expect(accepts(withPaths, value)).toBe(true);
    },
  );

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

  it('names the allowed schemes in the error', () => {
    const result = withPaths.safeParse('javascript:alert(1)');
    expect(result.error?.issues[0].message).toBe(
      'Expected a URL with scheme https: or a relative path',
    );
  });
});
