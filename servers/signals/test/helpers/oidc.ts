import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  type JWTPayload,
  SignJWT,
} from 'jose';
import OidcVerifier from 'src/auth/oidc.verifier';
import type Config from 'src/config/config.service';
import type { OidcProvider } from 'src/config/schema';

export const KEYCLOAK: OidcProvider = {
  issuer: 'https://keycloak.example.org/realms/dtaas',
  audience: 'dtaas-signals',
  'jwks-url': 'https://keycloak.example.org/realms/dtaas/certs',
  'groups-claim': 'groups',
  'groups-format': 'access-plan',
};

/** A signing key and a verifier that trusts it for the given config. */
export async function localIssuer(config: Config) {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const jwk = { ...(await exportJWK(publicKey)), alg: 'RS256' };
  const verifier = new OidcVerifier(config);
  verifier.useKeySets(() => createLocalJWKSet({ keys: [jwk] }));
  const sign = (claims: JWTPayload, expiresIn: string | number = '5m') =>
    new SignJWT(claims)
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(privateKey);
  return { verifier, sign };
}
