import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import Config from '../config/config.service.js';
import GitLabClient from './gitlab.client.js';
import TtlCache from './ttl-cache.js';

export type Identity = {
  id: number;
  username: string;
  email: string;
  /** When the token stops working, in epoch milliseconds, if it expires. */
  expiresAt?: number;
};

export class InvalidTokenError extends Error {
  constructor() {
    super('The access token is not valid');
  }
}

const tokenInfoSchema = z.object({
  resource_owner_id: z.number().int(),
  expires_in_seconds: z.number().nullable().optional(),
  application: z.object({ uid: z.string() }).nullable().optional(),
});

const userSchema = z.object({
  id: z.number().int(),
  username: z.string().min(1),
  email: z.string().default(''),
});

// The cache key is a hash, so the cache never holds a token itself.
function cacheKeyOf(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Who a GitLab access token belongs to, asked of the configured GitLab. */
@Injectable()
export default class IdentityService {
  private readonly cache = new TtlCache<Identity>();

  // eslint-disable-next-line no-useless-constructor
  constructor(
    private readonly config: Config,
    private readonly gitlab: GitLabClient,
  ) {} // eslint-disable-line no-empty-function

  async resolve(token: string, now = Date.now()): Promise<Identity> {
    const key = cacheKeyOf(token);
    const cached = this.cache.get(key, now);
    if (cached !== undefined) return cached;
    const identity = await this.lookUp(token, now);
    const ttlEnd = now + this.config.get('identity-cache-ttl');
    this.cache.set(
      key,
      identity,
      Math.min(ttlEnd, identity.expiresAt ?? ttlEnd),
    );
    return identity;
  }

  private async lookUp(token: string, now: number): Promise<Identity> {
    try {
      const [info, user] = await Promise.all([
        this.gitlab.getJson('oauth/token/info', token),
        this.gitlab.getJson('api/v4/user', token),
      ]);
      const tokenInfo = tokenInfoSchema.parse(info);
      const owner = userSchema.parse(user);
      if (tokenInfo.resource_owner_id !== owner.id)
        throw new InvalidTokenError();
      // A token GitLab issued to another OAuth application of the same user
      // is not a DTaaS sign-in, so it reads nothing.
      const clientId = this.config.get('gitlab-client-id');
      if (clientId !== '' && tokenInfo.application?.uid !== clientId)
        throw new InvalidTokenError();
      const seconds = tokenInfo.expires_in_seconds;
      if (typeof seconds === 'number' && seconds <= 0)
        throw new InvalidTokenError();
      const expiresAt =
        typeof seconds === 'number' ? now + seconds * 1000 : undefined;
      return { ...owner, expiresAt };
    } catch {
      // Any failure, including GitLab being unreachable, counts as an
      // invalid token: the gateway fails closed.
      throw new InvalidTokenError();
    }
  }
}
