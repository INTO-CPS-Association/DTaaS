import { UnauthorizedException } from '@nestjs/common';

// The message of each 401; none of them names a principal, so that no
// refusal helps to guess a name before the signature is checked
const REFUSALS = {
  missing: 'missing credential',
  malformed: 'malformed credential',
  invalid: 'invalid credential',
  claims: 'invalid claims',
  expired: 'expired credential',
  mismatch: 'credential does not match the request',
  replayed: 'replayed credential',
} as const;

export type Refusal = keyof typeof REFUSALS;

export const refuse = (refusal: Refusal): UnauthorizedException =>
  new UnauthorizedException(REFUSALS[refusal]);
