import { isSafeHttpUrl } from 'util/safeUrl';

describe('isSafeHttpUrl', () => {
  it.each(['https://example.com/path', 'http://localhost:4000', './library'])(
    'accepts %s',
    (url) => {
      expect(isSafeHttpUrl(url)).toBe(true);
    },
  );

  /* eslint-disable no-script-url -- the rejected URLs are the subject here */
  it.each([
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
  ])('rejects %s', (url) => {
    expect(isSafeHttpUrl(url)).toBe(false);
  });
  /* eslint-enable no-script-url */

  it.each([undefined, ''])('rejects %s', (url) => {
    expect(isSafeHttpUrl(url)).toBe(false);
  });

  // A malformed address is what the identity provider can put in the claim,
  // and the parser throws on it instead of returning something to inspect.
  it.each(['http://[', 'http://a b', 'https://%', 'http://:80'])(
    'rejects %s, which the parser refuses outright',
    (url) => {
      expect(isSafeHttpUrl(url)).toBe(false);
    },
  );
});
