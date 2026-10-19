import { describe, expect, it } from '@jest/globals';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import SignalsAuthGuard, {
  type AuthenticatedRequest,
  userOf,
} from 'src/auth/auth.guard';
import IdentityService, { InvalidTokenError } from 'src/auth/identity.service';
import testConfig from 'test/helpers/config';

const ALICE = { id: 7, username: 'alice', email: 'Alice@example.org' };

function requestWith(headers: Record<string, string>): AuthenticatedRequest {
  return { headers } as unknown as AuthenticatedRequest;
}

function contextOf(request: AuthenticatedRequest): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

const identities = {
  resolve: async (token: string) => {
    if (token === 'good') return ALICE;
    throw new InvalidTokenError();
  },
} as unknown as IdentityService;

function guardWith(forwardedHeader = '') {
  return new SignalsAuthGuard(
    testConfig({ 'forwarded-user-header': forwardedHeader }),
    identities,
  );
}

describe('SignalsAuthGuard', () => {
  it('refuses a request without a bearer token', async () => {
    await expect(
      guardWith().canActivate(contextOf(requestWith({}))),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    const basic = requestWith({ authorization: 'Basic abc' });
    await expect(
      guardWith().canActivate(contextOf(basic)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refuses a token GitLab does not vouch for', async () => {
    const request = requestWith({ authorization: 'Bearer bad' });
    await expect(
      guardWith().canActivate(contextOf(request)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('accepts a valid token and keeps the user on the request', async () => {
    const request = requestWith({ authorization: 'Bearer good' });
    await expect(guardWith().canActivate(contextOf(request))).resolves.toBe(
      true,
    );
    expect(userOf(request)).toEqual({ identity: ALICE, token: 'good' });
  });

  it('refuses when the forwarded user is someone else', async () => {
    const request = requestWith({
      authorization: 'Bearer good',
      'x-forwarded-user': 'bob@example.org',
    });
    await expect(
      guardWith('x-forwarded-user').canActivate(contextOf(request)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    const missing = requestWith({ authorization: 'Bearer good' });
    await expect(
      guardWith('x-forwarded-user').canActivate(contextOf(missing)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('accepts when the forwarded user is the token owner, in any case', async () => {
    const request = requestWith({
      authorization: 'Bearer good',
      'x-forwarded-user': 'alice@EXAMPLE.org',
    });
    await expect(
      guardWith('X-Forwarded-User').canActivate(contextOf(request)),
    ).resolves.toBe(true);
  });

  it('has no user on a request the guard did not pass', () => {
    expect(() => userOf(requestWith({}))).toThrow(UnauthorizedException);
  });
});
