import type { ScriptStatus, StoredMachine } from '../dto/fsm.dto.js';
import type { Definition } from './definition.js';

// The machine to resume, and why it does not resume the stored one
export type Recovered = StoredMachine & { warning?: string };

const UNSTARTED: StoredMachine = { state: undefined, entry: 0, status: 'none' };

// A script that ran when the runner stopped did not finish, and is not
// run again
const resumed = (status: ScriptStatus): ScriptStatus =>
  status === 'running' ? 'interrupted' : status;

// An unstarted machine that keeps the stored entry counter, so that
// entry numbers never repeat; a stored state that the definition no
// longer has is named in a warning
function unstarted(entry: number, unknown?: string): Recovered {
  const machine: Recovered = { state: undefined, entry, status: 'none' };
  if (unknown !== undefined) {
    machine.warning = `Stored state ${unknown} is not in the state machine, which starts unstarted`;
  }
  return machine;
}

// The machine to resume from the stored one, if there is one
export default function recover(
  definition: Definition,
  stored: StoredMachine = UNSTARTED,
): Recovered {
  const { state, entry, status } = stored;
  if (state === undefined || !definition.states.has(state)) {
    return unstarted(entry, state);
  }
  return { state, entry, status: resumed(status) };
}
