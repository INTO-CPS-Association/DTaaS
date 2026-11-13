import { describe, expect, it } from '@jest/globals';
import { GitLabError } from 'src/auth/gitlab.client';
import IdentityService, { InvalidTokenError } from 'src/auth/identity.service';
import OidcVerifier from 'src/auth/oidc.verifier';
import testConfig from 'test/helpers/config';
import FakeGitLabClient from 'test/helpers/fake-gitlab-client';

// GitLab answers with a numeric id, which the identity keeps as text.
const ALICE = { id: 7, username: 'alice', email: 'alice@example.org' };

function gitlabWith(
  expiresIn: number | null,
  owner = ALICE.id,
  application = 'dtaas-client',
  scope = ['api', 'openid'],
) {
  return new FakeGitLabClient([
    [
      /^oauth\/token\/info$/,
      () => ({
        resource_owner_id: owner,
        expires_in_seconds: expiresIn,
        application: { uid: application },
        scope,
      }),
    ],
    [/^api\/v4\/user$/, () => ALICE],
  ]);
}

function serviceWith(
  gitlab: FakeGitLabClient,
  ttl = 60_000,
  clientId: string[] = [],
) {
  const config = testConfig({
    'identity-cache-ttl': ttl,
    'gitlab-client-id': clientId,
  });
  return new IdentityService(
    config,
    gitlab.asClient(),
    new OidcVerifier(config),
  );
}

describe('IdentityService', () => {
  it('asks the configured GitLab who owns the token', async () => {
    const gitlab = gitlabWith(3600);
    const identity = await serviceWith(gitlab).resolve('token-a', 1000);
    expect(identity).toEqual({
      ...ALICE,
      id: '7',
      expiresAt: 1000 + 3600 * 1000,
    });
    expect(gitlab.tokens).toEqual(['token-a', 'token-a']);
  });

  it('answers from the cache within the TTL and asks again after it', async () => {
    const gitlab = gitlabWith(3600);
    const service = serviceWith(gitlab, 60_000);
    await service.resolve('token-a', 0);
    await service.resolve('token-a', 59_999);
    expect(gitlab.callsTo(/^api\/v4\/user$/)).toBe(1);
    await service.resolve('token-a', 60_000);
    expect(gitlab.callsTo(/^api\/v4\/user$/)).toBe(2);
  });

  it('never serves a cached identity past the token expiry', async () => {
    const gitlab = gitlabWith(10);
    const service = serviceWith(gitlab, 60_000);
    await service.resolve('token-a', 0);
    await service.resolve('token-a', 10_000);
    expect(gitlab.callsTo(/^api\/v4\/user$/)).toBe(2);
  });

  it('keeps a token without expiry for the TTL only', async () => {
    const identity = await serviceWith(gitlabWith(null)).resolve('token-a', 0);
    expect(identity.expiresAt).toBeUndefined();
  });

  it('refuses a token GitLab rejects', async () => {
    const gitlab = new FakeGitLabClient([
      [/./, (r) => new GitLabError(401, r)],
    ]);
    await expect(serviceWith(gitlab).resolve('bad')).rejects.toBeInstanceOf(
      InvalidTokenError,
    );
  });

  it('refuses an expired token and one whose owner is not the user', async () => {
    await expect(
      serviceWith(gitlabWith(0)).resolve('t'),
    ).rejects.toBeInstanceOf(InvalidTokenError);
    await expect(
      serviceWith(gitlabWith(60, 99)).resolve('t'),
    ).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it('accepts only tokens of the configured OAuth application', async () => {
    const own = await serviceWith(gitlabWith(60), 60_000, [
      'dtaas-client',
    ]).resolve('t');
    expect(own.username).toBe('alice');
    await expect(
      serviceWith(gitlabWith(60, ALICE.id, 'other-app'), 60_000, [
        'dtaas-client',
      ]).resolve('t'),
    ).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it('accepts any application of the allow-list, such as the gateway and the client', async () => {
    const allowed = ['signals-gateway', 'dtaas-client'];
    const gateway = gitlabWith(60, ALICE.id, 'signals-gateway');
    const client = gitlabWith(60, ALICE.id, 'dtaas-client');
    await expect(
      serviceWith(gateway, 60_000, allowed).resolve('t'),
    ).resolves.toMatchObject({ username: 'alice' });
    await expect(
      serviceWith(client, 60_000, allowed).resolve('t'),
    ).resolves.toMatchObject({ username: 'alice' });
  });

  it('refuses a token without a scope that reads the API', async () => {
    const readUser = gitlabWith(60, ALICE.id, 'dtaas-client', ['read_user']);
    await expect(serviceWith(readUser).resolve('t')).rejects.toBeInstanceOf(
      InvalidTokenError,
    );
    const readApi = gitlabWith(60, ALICE.id, 'dtaas-client', ['read_api']);
    await expect(serviceWith(readApi).resolve('t')).resolves.toMatchObject({
      username: 'alice',
    });
  });
});
