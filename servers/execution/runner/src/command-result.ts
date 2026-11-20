import { CommandRefused } from './dto/command.dto.js';
import {
  CommandRecord,
  CommandResult,
} from './interfaces/command.interface.js';
import { RunOptions, RunOutcome } from './interfaces/runner.interface.js';

// The outcome of a stored command; an unfinished or interrupted one
// counts as failed
const OUTCOME: Record<string, RunOutcome> = {
  valid: 'success',
  stopped: 'stopped',
};

// A finished command that was not permitted is refused again
export function storedResult(command: CommandRecord): CommandResult {
  if (command.finished && command.status === 'invalid') {
    throw new CommandRefused('invalid command');
  }
  return [
    OUTCOME[command.status] ?? 'failed',
    new Map([
      ['stdout', command.stdout],
      ['stderr', command.stderr],
    ]),
    command.exitCode,
    command.resources,
  ];
}

// Joining a run would drop the input of the request
export function refuseInput(options?: RunOptions): void {
  if (options?.input !== undefined) {
    throw new CommandRefused('command running');
  }
}
