import { Injectable } from '@nestjs/common';
import {
  createRemoteJWKSet,
  decodeJwt,
  type JWTPayload,
  jwtVerify,
  type JWTVerifyGetKey,
} from 'jose';
import Config from '../config/config.service.js';
import type { OidcProvider } from '../config/schema.js';

// Only the asymmetric algorithms Keycloak and Dex sign with. A token that
// names 'none' or an HMAC algorithm is refused (RFC 8725, section 3.1).
const ALGORITHMS = ['RS256', 'ES256'];

export type OidcClaims = {
  subject: string;
  username: string;
  email: string;
  groups: string[];
  expiresAt?: number;
};

export type KeySetFactory = (provider: OidcProvider) => JWTVerifyGetKey;

const remoteKeySet: KeySetFactory = (provider) =>
  createRemoteJWKSet(new URL(provider['jwks-url']));

function textClaim(payload: JWTPayload, name: string): string {
  const value = payload[name];
  return typeof value === 'string' ? value : '';
}

function listClaim(payload: JWTPayload, name: string): string[] {
  const value = payload[name];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

/** Checks a JWT of a configured Keycloak or Dex issuer. */
@Injectable()
export default class OidcVerifier {
  private readonly keySets = new Map<string, JWTVerifyGetKey>();
  private keySetOf: KeySetFactory = remoteKeySet;

  // eslint-disable-next-line no-useless-constructor, no-empty-function
  constructor(private readonly config: Config) {}

  /** Lets a test sign tokens with a local key set. */
  useKeySets(factory: KeySetFactory): void {
    this.keySetOf = factory;
    this.keySets.clear();
  }

  /** The issuer a token names, or undefined when it is not a JWT. */
  issuerOf(token: string): string | undefined {
    try {
      return decodeJwt(token).iss ?? '';
    } catch {
      return undefined;
    }
  }

  /** The configured provider of an issuer. */
  providerOf(issuer: string): OidcProvider | undefined {
    return this.config
      .get('oidc-providers')
      .find((provider) => provider.issuer === issuer);
  }

  async verify(token: string, provider: OidcProvider): Promise<OidcClaims> {
    const { payload } = await jwtVerify(token, this.keySet(provider), {
      issuer: provider.issuer,
      audience: provider.audience,
      algorithms: ALGORITHMS,
      requiredClaims: ['sub', 'exp'],
    });
    return {
      subject: `${provider.issuer}#${payload.sub}`,
      username: textClaim(payload, 'preferred_username'),
      email: textClaim(payload, 'email'),
      groups: listClaim(payload, provider['groups-claim']),
      expiresAt: payload.exp === undefined ? undefined : payload.exp * 1000,
    };
  }

  private keySet(provider: OidcProvider): JWTVerifyGetKey {
    const cached = this.keySets.get(provider.issuer);
    if (cached !== undefined) return cached;
    const created = this.keySetOf(provider);
    this.keySets.set(provider.issuer, created);
    return created;
  }
}
