import { z } from 'zod';

// The payload of the naming convention: a number, the time of the reading
// in RFC 3339 with its offset, and a SenML unit code.
const payloadSchema = z.object({
  value: z.number().finite(),
  ts: z.iso.datetime({ offset: true }),
  unit: z.string().min(1).max(32),
});

/** True when the message follows the payload convention. */
export default function followsConvention(body: Buffer): boolean {
  try {
    return payloadSchema.safeParse(JSON.parse(body.toString('utf8'))).success;
  } catch {
    return false;
  }
}
