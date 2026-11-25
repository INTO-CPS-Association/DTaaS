import { describe, expect, it } from '@jest/globals';
import { SignJWT } from 'jose';
import FakeGitLabClient from 'test/helpers/fake-gitlab-client';
import IdentityService, { InvalidTokenError } from 'src/auth/identity.service';
import testConfig from 'test/helpers/config';
import { KEYCLOAK, localIssuer } from 'test/helpers/oidc';

const config = testConfig({ 'oidc-providers': [KEYCLOAK] });
const ALICE_CLAIMS = {
  iss: KEYCLOAK.issuer,
  aud: KEYCLOAK.audience,
  sub: 'u-1',
  preferred_username: 'alice',
  email: 'alice@example.org',
  groups: ['alice_member', 'bob_viewer', 'unrelated'],
};

async function setUp() {
  const { verifier, sign } = await localIssuer(config);
  const gitlab = new FakeGitLabClient([]);
  const identities = new IdentityService(config, gitlab.asClient(), verifier);
  return { identities, sign, gitlab };
}

describe('A Keycloak or Dex sign-in', () => {
  it('accepts a token of a configured issuer for the gateway, without asking GitLab', async () => {
    const { identities, sign, gitlab } = await setUp();
    const identity = await identities.resolve(await sign(ALICE_CLAIMS));
    expect(identity).toMatchObject({
      id: `${KEYCLOAK.issuer}#u-1`,
      username: 'alice',
      owners: ['alice', 'bob'],
    });
    expect(gitlab.tokens).toEqual([]);
  });

  it.each([
    ['another audience', { ...ALICE_CLAIMS, aud: 'another-app' }],
    ['no subject', { ...ALICE_CLAIMS, sub: undefined }],
  ])('refuses a token with %s', async (_label, claims) => {
    const { identities, sign } = await setUp();
    await expect(identities.resolve(await sign(claims))).rejects.toBeInstanceOf(
      InvalidTokenError,
    );
  });

  it('refuses an expired token', async () => {
    const { identities, sign } = await setUp();
    const expired = await sign(
      ALICE_CLAIMS,
      Math.floor(Date.now() / 1000) - 60,
    );
    await expect(identities.resolve(expired)).rejects.toBeInstanceOf(
      InvalidTokenError,
    );
  });

  it('refuses a token signed by another key, and an unsigned token', async () => {
    const { identities } = await setUp();
    const other = await localIssuer(config);
    await expect(
      identities.resolve(await other.sign(ALICE_CLAIMS)),
    ).rejects.toBeInstanceOf(InvalidTokenError);
    const unsigned = await new SignJWT(ALICE_CLAIMS)
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('5m')
      .sign(new TextEncoder().encode('shared-secret-of-32-bytes-long!!'));
    await expect(identities.resolve(unsigned)).rejects.toBeInstanceOf(
      InvalidTokenError,
    );
  });

  it('refuses a JWT of an unknown issuer without sending it to GitLab', async () => {
    const { identities, sign, gitlab } = await setUp();
    const token = await sign({ ...ALICE_CLAIMS, iss: 'https://evil.example' });
    await expect(identities.resolve(token)).rejects.toBeInstanceOf(
      InvalidTokenError,
    );
    expect(gitlab.tokens).toEqual([]);
  });

  it('reads Keycloak groups with the leading slash of their full path', async () => {
    const { identities, sign } = await setUp();
    const token = await sign({ ...ALICE_CLAIMS, groups: ['/alice_viewer'] });
    await expect(identities.resolve(token)).resolves.toMatchObject({
      owners: ['alice'],
    });
  });
});
