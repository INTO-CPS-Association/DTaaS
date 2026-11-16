import { z } from 'zod';

// An account or a group: a name as useradd takes it, or a number as a
// YAML integer or a string of digits
const ID = /^(?:[a-z_][a-z0-9_.-]{0,31}|\d+)$/;

const idSchema = z.union([
  z.int().nonnegative(),
  z.string().regex(ID, 'must be a name of up to 32 characters or a number'),
]);

export type AccountId = z.infer<typeof idSchema>;

// Runs the scripts as a second account, on Linux only; the section
// turns it on, so a stray scripts: fails
export const scriptsSchema = z.strictObject({
  user: idSchema,
  // optional; instead of the account's primary group
  group: idSchema.optional(),
  // the working directory of every script, the one place it may write;
  // relative to runner.yaml, or absolute
  runDirectory: z.string().min(1),
});

export type ScriptsConfig = z.infer<typeof scriptsSchema>;
