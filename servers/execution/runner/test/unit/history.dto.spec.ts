import { describe, expect, it } from '@jest/globals';
import { historyQuerySchema } from 'src/dto/history.dto';

const parse = (query: unknown) => historyQuerySchema.safeParse(query);

describe('historyQuerySchema', () => {
  it.each([undefined, {}])('defaults the limit to 100 for %p', (query) => {
    expect(parse(query)).toEqual({ success: true, data: { limit: 100 } });
  });

  it('coerces a limit given as a string, as in a query string', () => {
    expect(parse({ limit: '2' }).data).toEqual({ limit: 2 });
  });

  it.each([
    '2026-10-26T14:56:00Z',
    '2026-10-26T14:56:00.250Z',
    '2026-10-26T16:56:00+02:00',
  ])('accepts since %s', (since) => {
    expect(parse({ since }).data).toEqual({ since, limit: 100 });
  });

  it('ignores an unknown parameter', () => {
    expect(parse({ limit: '1000', page: '2' }).data).toEqual({ limit: 1000 });
  });

  it.each([
    { limit: '0' },
    { limit: '1001' },
    { limit: '1.5' },
    { limit: 'ten' },
    { limit: ['1', '2'] },
    { since: 'yesterday' },
    { since: '2026-10-26' },
    { since: '2026-10-26T14:56:00' },
    { since: ['2026-10-26T14:56:00Z', '2026-10-26T14:57:00Z'] },
    null,
    [],
    'limit=2',
  ])('refuses %p', (query) => {
    expect(parse(query).success).toBe(false);
  });
});
