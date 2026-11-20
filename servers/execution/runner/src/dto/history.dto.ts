import { z } from 'zod';
import type { ScriptResources } from '../resources/resources.js';
import type { CommandStateStatus } from './state.dto.js';

export const HISTORY_LIMIT = 1000;

// The query of GET /history, or the payload of MQTT history. since is
// compared to the second, as the times are stored; zod 4's .default
// would give {} without running the inner default, so .prefault
export const historyQuerySchema = z
  .object({
    since: z.iso.datetime({ offset: true }).optional(),
    limit: z.coerce.number().int().min(1).max(HISTORY_LIMIT).default(100),
  })
  .prefault({});

export type HistoryQuery = z.infer<typeof historyQuerySchema>;

// A command of the history, without its logs, which stay on GET /. by
// is the principal that submitted it, or null without access control
// and for a state's script. Its resources are null until it finishes.
export type HistoryEntryDto = {
  id: number;
  name: string;
  status: CommandStateStatus;
  exitCode: number | null;
  receivedAt: string;
  finishedAt: string | null;
  by: string | null;
  resources: ScriptResources;
};
