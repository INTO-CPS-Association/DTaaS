import { describe, expect, it } from '@jest/globals';
import { z } from 'zod';
import { authSchema, publicKeySchema } from 'src/auth/auth.config';
import { newCaller } from 'test/sign.util';

const manager = newCaller('manager-1');
const alice = newCaller('alice');

const principal = (name: string, role: string, publicKey: string) => ({
  name,
  role,
  publicKey,
});

const valid = {
  principals: [
    principal('manager-1', 'manager', manager.publicKey),
    principal('alice', 'client', alice.publicKey),
  ],
};

function problems(auth: unknown): string {
  const result = authSchema.safeParse(auth);
  return result.success ? '' : z.prettifyError(result.error);
}

describe('Access control schema', () => {
  it('Should accept principals with a name, a role and a key', () => {
    expect(authSchema.parse(valid)).toEqual(valid);
  });

  it.each([
    ['no principal', { principals: [] }, 'at least one principal'],
    ['no principals key', {}, 'principals'],
    [
      'a duplicate name',
      { principals: [valid.principals[0], valid.principals[0]] },
      'duplicate principal manager-1',
    ],
    [
      'the name script',
      { principals: [principal('script', 'client', alice.publicKey)] },
      'script is reserved',
    ],
    [
      'an invalid name',
      { principals: [principal('-x', 'client', alice.publicKey)] },
      'must be up to 64',
    ],
    [
      'the role script',
      { principals: [principal('bob', 'script', alice.publicKey)] },
      'role',
    ],
    [
      'an unknown key of a principal',
      { principals: [{ ...valid.principals[1], email: 'a@b.c' }] },
      'email',
    ],
    ['an unknown key', { ...valid, users: [] }, 'users'],
  ])('Should refuse %s', (_, auth, message) => {
    expect(problems(auth)).toContain(message);
  });

  it.each([
    ['a key of 31 bytes', Buffer.alloc(31, 1).toString('base64url')],
    ['a key of 33 bytes', Buffer.alloc(33, 1).toString('base64url')],
    ['a key in base64 with padding', `${alice.publicKey}=`],
    ['a key with characters outside base64url', `${'+'.repeat(43)}`],
    ['an empty key', ''],
  ])('Should refuse %s', (_, key) => {
    expect(publicKeySchema.safeParse(key).success).toBe(false);
  });

  it('Should accept an Ed25519 public key', () => {
    expect(publicKeySchema.safeParse(alice.publicKey).success).toBe(true);
  });
});
