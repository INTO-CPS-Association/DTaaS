import { z } from 'zod';

// A state names a script, so a name can not be a path, a flag or an
// object property such as __proto__
const NAME = /^[A-Za-z0-9][\w.-]{0,63}$/;

export const nameSchema = z
  .string()
  .regex(NAME, 'must be up to 64 letters, digits, _, . or -, from a letter');
