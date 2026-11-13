import { describe, it, expect } from '@jest/globals';
import { buildCorsOptions, normalizeCorsOrigin } from 'src/config/cors';

describe('CORS config helpers', () => {
  it('disables cross-origin requests when no origin is configured', () => {
    expect(normalizeCorsOrigin('')).toBe(false);
  });

  it('supports wildcard input by allowing all origins', () => {
    expect(normalizeCorsOrigin('*')).toBe(true);
  });

  it('keeps explicit http/https origins unchanged', () => {
    expect(normalizeCorsOrigin('https://ui.example')).toBe(
      'https://ui.example',
    );
    expect(normalizeCorsOrigin('http://localhost:4000')).toBe(
      'http://localhost:4000',
    );
  });

  it('normalizes host:port values to http origin', () => {
    expect(normalizeCorsOrigin('frontend.local:3000')).toBe(
      'http://frontend.local:3000',
    );
  });

  it('normalizes multiple configured origins', () => {
    expect(
      normalizeCorsOrigin([
        'https://client-a.example.org',
        'client-b.example.org',
      ]),
    ).toEqual(['https://client-a.example.org', 'http://client-b.example.org']);
  });

  it('builds CORS options without credentials by default', () => {
    expect(buildCorsOptions('*', false)).toEqual({
      origin: true,
      methods: ['GET', 'POST', 'OPTIONS'],
      credentials: false,
    });
  });

  it('allows credentials with an explicit origin', () => {
    expect(buildCorsOptions('https://ui.example', true)).toEqual({
      origin: 'https://ui.example',
      methods: ['GET', 'POST', 'OPTIONS'],
      credentials: true,
    });
  });

  it('rejects credentials with a reflected wildcard origin', () => {
    expect(() => buildCorsOptions('*', true)).toThrow(
      'cors-allow-credentials cannot be enabled with cors-allow-origin: *',
    );
  });
});
