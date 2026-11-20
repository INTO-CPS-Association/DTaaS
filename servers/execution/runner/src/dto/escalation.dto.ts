import { z } from 'zod';

// The limits, in bytes of the JSON text of each value
export const REASON_LIMIT = 1024;

export const PROPOSAL_LIMIT = 4096;

// Whether the JSON text of a value fits in the limit, in bytes. 05 has
// the same rule; once both are merged, one copy stays.
const fits =
  (limit: number) =>
  (value: unknown): boolean =>
    Buffer.byteLength(JSON.stringify(value), 'utf8') <= limit;

// z.record would drop a __proto__ key without an error, so the proposal
// passes as it was received
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const escalateSchema = z.object({
  reason: z.string().min(1).refine(fits(REASON_LIMIT)),
  proposal: z
    .custom<Record<string, unknown>>(isObject)
    .refine(fits(PROPOSAL_LIMIT))
    .optional(),
});

export type EscalateBody = z.infer<typeof escalateSchema>;

export type EscalateReplyDto = { status: 'accepted' };

export type EscalationTrigger = 'failure' | 'no-transition' | 'request';

// The data of an escalation notification; state and entry are those of
// the machine when the trigger fired, null and 0 without one
export type EscalationData = {
  trigger: EscalationTrigger;
  state: string | null;
  entry: number;
  event: string | null;
  reason: string;
  proposal: Record<string, unknown> | null;
};
