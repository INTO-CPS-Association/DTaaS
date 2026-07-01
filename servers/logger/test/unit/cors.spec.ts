import { describe, it, expect } from '@jest/globals';
import { buildCorsOptions, normalizeCorsOrigin } from 'src/config/cors';

describe('CORS config helpers', () => {
  it('allows all origins for default cors-allow-origin value', () => {
    expect(normalizeCorsOrigin('0.0.0.0:4003', 4003)).toBe(true);
  });

  it('supports wildcard input by allowing all origins', () => {
    expect(normalizeCorsOrigin('*', 4003)).toBe(true);
  });

  it('keeps explicit http/https origins unchanged', () => {
    expect(normalizeCorsOrigin('https://ui.example', 4003)).toBe(
      'https://ui.example',
    );
    expect(normalizeCorsOrigin('http://localhost:4000', 4003)).toBe(
      'http://localhost:4000',
    );
  });

  it('normalizes host:port values to http origin', () => {
    expect(normalizeCorsOrigin('frontend.local:3000', 4003)).toBe(
      'http://frontend.local:3000',
    );
  });

  it('builds cors options with expected methods', () => {
    expect(buildCorsOptions('*', 4003)).toEqual({
      origin: true,
      methods: ['GET', 'POST', 'OPTIONS'],
      credentials: true,
    });
  });
});
