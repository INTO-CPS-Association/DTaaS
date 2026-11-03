import { allowedOrigins, assertAllowedSource } from 'extension/allowedOrigins';

describe('the origins a visualisation may load from', () => {
  afterEach(() => {
    delete globalThis.env.REACT_APP_VIZ_ALLOWED_ORIGINS;
  });

  it('lists no origin by default', () => {
    expect(allowedOrigins(undefined).size).toBe(0);
    expect(allowedOrigins('').size).toBe(0);
  });

  it('reads origins separated by commas, and skips what is not an address', () => {
    const origins = allowedOrigins(
      ' https://grafana.example/d/x , not an address,http://plot.example:8080',
    );

    expect([...origins]).toEqual([
      'https://grafana.example',
      'http://plot.example:8080',
    ]);
  });

  it('accepts the own origin and listed origins, and refuses others', () => {
    const allowed = allowedOrigins('https://grafana.example');
    const own = 'https://dtaas.example';

    expect(() =>
      assertAllowedSource('https://dtaas.example/a.png', allowed, own),
    ).not.toThrow();
    expect(() =>
      assertAllowedSource('https://grafana.example/d/1', allowed, own),
    ).not.toThrow();
    expect(() =>
      assertAllowedSource('https://evil.example/page', allowed, own),
    ).toThrow(
      'https://evil.example is not an allowed source of images and embedded pages',
    );
    expect(() =>
      assertAllowedSource('http://grafana.example/d/1', allowed, own),
    ).toThrow('REACT_APP_VIZ_ALLOWED_ORIGINS');
  });

  it('reads env.js and the page origin when it is not told them', () => {
    globalThis.env.REACT_APP_VIZ_ALLOWED_ORIGINS = 'https://grafana.example';

    expect(() =>
      assertAllowedSource('https://grafana.example/d'),
    ).not.toThrow();
    expect(() =>
      assertAllowedSource(`${globalThis.location.origin}/x`),
    ).not.toThrow();
    expect(() => assertAllowedSource('https://other.example/d')).toThrow();
  });
});
