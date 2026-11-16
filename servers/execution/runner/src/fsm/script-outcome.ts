import { Logger } from '@nestjs/common';
import ExecaManager from '../execa-manager.service.js';
import { RunOutcome } from '../interfaces/runner.interface.js';

// The script of a state, and the environment it runs with
export type StateScript = { state: string; env: Record<string, string> };

// Runs the script of a state; a script that could not start, as when
// the database is closed, counts as failed
export default async function scriptOutcome(
  manager: ExecaManager,
  { state, env }: StateScript,
  logger: Logger,
): Promise<RunOutcome> {
  try {
    const [outcome] = await manager.newCommand(state, undefined, { env });
    return outcome;
  } catch (error) {
    logger.error(`Script of state ${state} did not run: ${error}`);
    return 'failed';
  }
}
