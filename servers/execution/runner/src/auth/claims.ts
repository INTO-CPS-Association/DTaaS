import { createHash } from 'node:crypto';
import { z } from 'zod';
import { refuse } from './refusal.js';

// Seconds of clock skew allowed either way, and the longest lifetime
export const SKEW = 30;

export const MAX_LIFETIME = 60;

const timeClaimsSchema = z.object({
  aud: z.string(),
  iat: z.number(),
  exp: z.number(),
  jti: z.string().min(16).max(64),
});

export type TimeClaims = z.infer<typeof timeClaimsSchema>;

// The claims that bind a token to one HTTP request
export const httpClaimsSchema = timeClaimsSchema.extend({
  htm: z.string(),
  htu: z.string(),
  bh: z.string(),
});

export type HttpClaims = z.infer<typeof httpClaimsSchema>;

// The envelope of an MQTT request: its topic and its plain body
export const mqttClaimsSchema = timeClaimsSchema.extend({
  topic: z.string(),
  body: z.unknown().optional(),
});

export type MqttClaims = z.infer<typeof mqttClaimsSchema>;

// The DT that a token must name, and the time in seconds
export type Expected = { aud: string; now: number };

function checkTimes({ iat, exp }: TimeClaims, now: number): void {
  const lifetime = exp - iat;
  const early = iat - SKEW > now;
  const late = exp + SKEW < now;
  if (lifetime <= 0 || lifetime > MAX_LIFETIME || early || late) {
    throw refuse('expired');
  }
}

// The claims of a verified token, if they have the shape of the schema,
// name this DT and hold now
export function readClaims<T extends TimeClaims>(
  schema: z.ZodType<T>,
  payload: unknown,
  { aud, now }: Expected,
): T {
  const result = schema.safeParse(payload);
  if (!result.success || result.data.aud !== aud) {
    throw refuse('claims');
  }
  checkTimes(result.data, now);
  return result.data;
}

// An HTTP request as the runner receives it: the path has no query
export type HttpRequest = { method: string; path: string; body?: Buffer };

export const bodyHash = (body: Buffer = Buffer.alloc(0)): string =>
  createHash('sha256').update(body).digest('base64url');

// The path, or the path behind a prefix that a gateway strips
function matchesPath(htu: string, path: string): boolean {
  const prefix = htu.slice(0, htu.length - path.length);
  return htu.endsWith(path) && (prefix === '' || prefix.startsWith('/'));
}

export function httpBinding(claims: HttpClaims, request: HttpRequest): void {
  const { method, path, body } = request;
  const sameRequest =
    claims.htm === method &&
    matchesPath(claims.htu, path) &&
    claims.bh === bodyHash(body);
  if (!sameRequest) {
    throw refuse('mismatch');
  }
}

export function topicBinding(claims: MqttClaims, topic: string): void {
  if (claims.topic !== topic) {
    throw refuse('mismatch');
  }
}
