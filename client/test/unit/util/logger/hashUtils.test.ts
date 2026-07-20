import { webcrypto } from 'node:crypto';
import { hashUsername } from 'util/logger/hashUtils';

beforeAll(() => {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    writable: true,
  });
});

describe('hashUtils', () => {
  it('returns a 64-character hex string', async () => {
    const hash = await hashUsername('testuser');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces consistent output for the same input', async () => {
    const hash1 = await hashUsername('alice');
    const hash2 = await hashUsername('alice');
    expect(hash1).toBe(hash2);
  });

  it('produces different output for different inputs', async () => {
    const hash1 = await hashUsername('alice');
    const hash2 = await hashUsername('bob');
    expect(hash1).not.toBe(hash2);
  });
});
