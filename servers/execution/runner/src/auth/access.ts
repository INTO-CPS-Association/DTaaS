import { KeyObject, randomBytes, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import {
  Principal,
  PrincipalConfig,
  publicKeyObject,
  Role,
  SCRIPT,
} from './auth.config.js';
import {
  httpBinding,
  httpClaimsSchema,
  HttpRequest,
  mqttClaimsSchema,
  readClaims,
  TimeClaims,
  topicBinding,
} from './claims.js';
import { parseJws, verifyJws } from './jws.js';
import { refuse } from './refusal.js';
import Replays from './replay.js';

type Listed = { role: Role; key: KeyObject };

// A verified MQTT request: who sent it, and its plain body
export type MqttGrant = { principal: Principal; body: unknown };

const BEARER = /^Bearer +(\S+)$/i;

function bearerToken(authorization: string | undefined): string {
  if (authorization === undefined || authorization === '') {
    throw refuse('missing');
  }
  const token = BEARER.exec(authorization)?.[1];
  if (token === undefined) {
    throw refuse('malformed');
  }
  return token;
}

// Tells the callers of the runner apart: the principals of runner.yaml
// by their signed tokens, and its scripts by the token drawn at start
export default class Access {
  // 32 random bytes, for RUNNER_TOKEN
  readonly scriptToken = randomBytes(32).toString('base64url');

  private readonly listed: Map<string, Listed>;

  private readonly replays = new Replays();

  constructor(
    principals: PrincipalConfig[],
    private readonly aud: string,
    private readonly clock: () => number = Date.now,
  ) {
    this.listed = new Map(
      principals.map(({ name, role, publicKey }) => [
        name,
        { role, key: publicKeyObject(publicKey) },
      ]),
    );
  }

  // A JWS has two dots, a script token none
  http(authorization: string | undefined, request: HttpRequest): Principal {
    const token = bearerToken(authorization);
    if (!token.includes('.')) {
      return this.script(token);
    }
    const { principal, claims } = this.verify(token, httpClaimsSchema);
    httpBinding(claims, request);
    this.accept(claims);
    return principal;
  }

  // The payload is the JWS itself; a plain request has no credential
  mqtt(topic: string, payload: Buffer): MqttGrant {
    const token = payload.toString().trim();
    if (token === '' || token.startsWith('{')) {
      throw refuse('missing');
    }
    const { principal, claims } = this.verify(token, mqttClaimsSchema);
    topicBinding(claims, topic);
    this.accept(claims);
    return { principal, body: claims.body };
  }

  private script(token: string): Principal {
    const given = Buffer.from(token);
    const own = Buffer.from(this.scriptToken);
    if (given.length !== own.length || !timingSafeEqual(given, own)) {
      throw refuse('invalid');
    }
    return { name: SCRIPT, role: SCRIPT };
  }

  private verify<T extends TimeClaims>(token: string, schema: z.ZodType<T>) {
    const jws = parseJws(token);
    const name = verifyJws(jws, (kid) => this.listed.get(kid)?.key);
    const expected = { aud: this.aud, now: this.now() };
    const claims = readClaims(schema, jws.payload, expected);
    const { role } = this.listed.get(name) as Listed;
    return { principal: { name, role }, claims };
  }

  // Only a token that passed every check uses up its jti
  private accept({ jti, exp }: TimeClaims): void {
    this.replays.remember(jti, exp, this.now());
  }

  private now(): number {
    return Math.floor(this.clock() / 1000);
  }
}
