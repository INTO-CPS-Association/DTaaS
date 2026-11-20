import { createPublicKey, KeyObject } from 'node:crypto';
import { z } from 'zod';
import { nameSchema } from '../fsm/name.js';

// An Ed25519 public key as the base64url of its 32 raw bytes, the x of
// its JWK (RFC 8037), which fits one YAML line
const RAW_KEY = /^[A-Za-z0-9_-]{43}$/;

export const publicKeyObject = (x: string): KeyObject =>
  createPublicKey({ key: { kty: 'OKP', crv: 'Ed25519', x }, format: 'jwk' });

function isPublicKey(x: string): boolean {
  try {
    publicKeyObject(x);
    return Buffer.from(x, 'base64url').length === 32;
  } catch {
    return false;
  }
}

export const publicKeySchema = z
  .string()
  .regex(RAW_KEY, 'must be the base64url of 32 bytes')
  .refine(isPublicKey, 'must be an Ed25519 public key');

// The role of the scripts, which no listed principal may take
export const SCRIPT = 'script';

export type Role = 'client' | 'manager' | typeof SCRIPT;

// Who made a request, as the runner logs and stores it
export type Principal = { name: string; role: Role };

const principalSchema = z
  .object({
    name: nameSchema.refine((name) => name !== SCRIPT, 'script is reserved'),
    role: z.enum(['client', 'manager']),
    publicKey: publicKeySchema,
  })
  .strict();

export type PrincipalConfig = z.infer<typeof principalSchema>;

// A duplicate name would make the key of a principal ambiguous
function duplicates(principals: PrincipalConfig[], context: z.RefinementCtx) {
  const seen = new Set<string>();
  principals.forEach(({ name }, index) => {
    if (seen.has(name)) {
      const message = `duplicate principal ${name}`;
      context.addIssue({ code: 'custom', message, path: [index, 'name'] });
    }
    seen.add(name);
  });
}

// Principals to verify the callers, a key to sign the output, or both;
// one at least, so that a stray auth: still fails
export const authSchema = z
  .object({
    principals: z
      .array(principalSchema)
      .min(1, 'needs at least one principal')
      .superRefine(duplicates)
      .optional(),
    // an Ed25519 private key, PEM PKCS#8, relative to runner.yaml
    key: z.string().min(1).optional(),
  })
  .strict()
  .refine(
    ({ principals, key }) => principals !== undefined || key !== undefined,
    'needs principals or a key',
  );

export type AuthConfig = z.infer<typeof authSchema>;
