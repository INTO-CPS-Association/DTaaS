import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import Config from '../config/config.service.js';
import IdentityService, { type Identity } from './identity.service.js';

const BEARER_PREFIX = 'Bearer ';

export type AuthenticatedUser = {
  identity: Identity;
  /** Kept to ask GitLab what this user may read. Never logged. */
  token: string;
};

export type AuthenticatedRequest = Request & {
  signalsUser?: AuthenticatedUser;
};

function bearerOf(request: Request): string {
  const header = request.headers.authorization ?? '';
  if (!header.startsWith(BEARER_PREFIX)) return '';
  return header.slice(BEARER_PREFIX.length).trim();
}

function headerValue(request: Request, name: string): string {
  const value = request.headers[name.toLowerCase()];
  const first = Array.isArray(value) ? value[0] : value;
  return (first ?? '').trim().toLowerCase();
}

export function userOf(request: AuthenticatedRequest): AuthenticatedUser {
  if (request.signalsUser === undefined) throw new UnauthorizedException();
  return request.signalsUser;
}

/**
 * Accepts a request only with a GitLab access token GitLab vouches for, or
 * a JWT of a configured Keycloak or Dex issuer that verifies.
 */
@Injectable()
export default class SignalsAuthGuard implements CanActivate {
  private readonly logger = new Logger(SignalsAuthGuard.name);

  // eslint-disable-next-line no-useless-constructor
  constructor(
    private readonly config: Config,
    private readonly identities: IdentityService,
  ) {} // eslint-disable-line no-empty-function

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = bearerOf(request);
    if (token === '') throw this.refuse(request, 'no-token');
    const identity = await this.identities.resolve(token).catch(() => {
      throw this.refuse(request, 'invalid-token');
    });
    if (!this.forwardedUserMatches(request, identity))
      throw this.refuse(request, 'forwarded-user-mismatch');
    request.signalsUser = { identity, token };
    return true;
  }

  // Behind traefik-forward-auth the proxy names the signed-in user. A token
  // of someone else, replayed in that session, is refused.
  private forwardedUserMatches(request: Request, identity: Identity): boolean {
    const headerName = this.config.get('forwarded-user-header');
    if (headerName === '') return true;
    const forwarded = headerValue(request, headerName);
    return forwarded !== '' && forwarded === identity.email.toLowerCase();
  }

  // One line per refused sign-in, with the client address and the reason
  // and never the token, so repeated failures can be seen and alerted on.
  private refuse(request: Request, reason: string): UnauthorizedException {
    this.logger.warn(
      JSON.stringify({
        action: 'sign-in',
        decision: 'deny',
        reason,
        client: request.ip ?? request.socket?.remoteAddress ?? 'unknown',
        route: request.path,
      }),
    );
    return new UnauthorizedException();
  }
}
