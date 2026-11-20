import { CommandRecord } from '../interfaces/command.interface.js';
import { FsmStateDto } from './fsm.dto.js';
import { ParameterValue } from './parameters.dto.js';

// running until the command finishes, then its stored status;
// interrupted when the runner restarted while it ran
export type CommandStateStatus =
  'running' | 'valid' | 'failed' | 'invalid' | 'stopped' | 'interrupted';

// The latest command, without its logs, which stay on GET /
export type CommandState = {
  name: string;
  status: CommandStateStatus;
  receivedAt: string;
  finishedAt: string | null;
};

// The state of the digital twin in one document: machine is the body
// of GET /fsm, or null without a state machine, and command is null
// before the first command. time is when the document was built.
export type StateDocumentDto = {
  id: string;
  time: string;
  machine: FsmStateDto | null;
  parameters: Record<string, ParameterValue>;
  command: CommandState | null;
};

export function commandState(
  record: CommandRecord | undefined,
): CommandState | null {
  if (record === undefined) {
    return null;
  }
  return {
    name: record.name,
    status: record.finished ? (record.status as CommandStateStatus) : 'running',
    receivedAt: record.receivedAt,
    finishedAt: record.finishedAt,
  };
}
