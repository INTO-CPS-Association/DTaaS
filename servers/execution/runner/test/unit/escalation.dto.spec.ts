import { describe, expect, it } from '@jest/globals';
import {
  escalateSchema,
  PROPOSAL_LIMIT,
  REASON_LIMIT,
} from 'src/dto/escalation.dto';

// A string whose JSON text, quotes included, has the size in bytes
const reasonOf = (bytes: number) => 'a'.repeat(bytes - 2);

// An object whose JSON text, {"p":"..."}, has the size in bytes
const proposalOf = (bytes: number) => ({ p: 'a'.repeat(bytes - 8) });

describe('Escalation request body', () => {
  it('Should accept a reason and a proposal at their limits', () => {
    const reason = { reason: reasonOf(REASON_LIMIT) };
    const proposal = { reason: 'a', proposal: proposalOf(PROPOSAL_LIMIT) };

    expect(escalateSchema.safeParse(reason).success).toBe(true);
    expect(escalateSchema.safeParse(proposal).success).toBe(true);
  });

  it('Should measure in bytes of UTF-8', () => {
    const reason = 'é'.repeat(REASON_LIMIT / 2);

    expect(escalateSchema.safeParse({ reason }).success).toBe(false);
  });

  it('Should keep a __proto__ key of the proposal', () => {
    const proposal = JSON.parse('{"__proto__": {"scope": "multi"}}');

    const result = escalateSchema.parse({ reason: 'capacity', proposal });

    expect(Object.hasOwn(result.proposal ?? {}, '__proto__')).toBe(true);
  });

  it.each([
    ['a missing reason', {}],
    ['an empty reason', { reason: '' }],
    ['a reason that is not a string', { reason: 42 }],
    ['a reason one byte too long', { reason: reasonOf(REASON_LIMIT + 1) }],
    [
      'a proposal one byte too long',
      { reason: 'capacity', proposal: proposalOf(PROPOSAL_LIMIT + 1) },
    ],
    ['an array as the proposal', { reason: 'capacity', proposal: [1] }],
    ['null as the proposal', { reason: 'capacity', proposal: null }],
    ['a string as the proposal', { reason: 'capacity', proposal: 'multi' }],
    ['a body that is not an object', 'capacity'],
  ])('Should reject %s', (_, body) => {
    expect(escalateSchema.safeParse(body).success).toBe(false);
  });
});
