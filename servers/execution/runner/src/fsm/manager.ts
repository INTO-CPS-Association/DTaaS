import { z } from 'zod';

// The commands a Manager may submit; nothing enforces them until access
// control by role (issue 15). Like a state, the section and its list may
// be left empty.
export const managerSchema = z
  .strictObject({ commands: z.array(z.string()).nullish() })
  .nullish();

// The commands of the section that runner.yaml does not permit
export const managerProblems = (
  commands: string[],
  permitted: string[],
): string[] =>
  commands
    .filter((command) => !permitted.includes(command))
    .map((command) => `manager command ${command} is not a permitted command`);
