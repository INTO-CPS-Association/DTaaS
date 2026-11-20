import { Logger } from '@nestjs/common';
import type { ScriptStatus, StoredMachine } from '../dto/fsm.dto.js';
import Queue from '../queue.service.js';
import type { Definition } from './definition.js';
import Parameters from './parameters.js';
import recover, { Recovered } from './recovery.js';

// The state and entry of a machine, as StateMachine and Recovered have
type Position = { state: string | undefined; entry: number };

const UNSTARTED: Recovered = { state: undefined, entry: 0, status: 'none' };

// Keeps the machine of the state machine service in the database of the
// queue, so that a restarted runner resumes it
export default class MachineStore {
  constructor(
    private readonly queue: Queue,
    private readonly logger: Logger,
  ) {}

  // A failed write is logged, as no reply depends on it
  save({ state, entry }: Position, status: ScriptStatus): void {
    try {
      this.queue.saveMachine({ state, entry, status });
    } catch (error) {
      this.logger.error(`Could not store the state machine: ${error}`);
    }
  }

  // No script survives a restart, so the commands that did not finish
  // are interrupted, with or without a state machine. The recovered
  // machine is written back at once, so a running row does not stay.
  restore(definition?: Definition, parameters?: Parameters): Recovered {
    this.queue.markInterrupted(new Date().toISOString());
    const stored = this.queue.loadMachine();
    if (definition === undefined) {
      this.ignore(stored);
      return UNSTARTED;
    }
    const recovered = recover(definition, stored);
    this.save(recovered, recovered.status);
    const dropped = parameters?.restore(this.queue.parameterValues());
    this.warn(recovered.warning, dropped ?? []);
    return recovered;
  }

  // The row stays for a runner.yaml that names a state machine again
  private ignore(stored: StoredMachine | undefined): void {
    if (stored !== undefined) {
      const { state, entry } = stored;
      this.logger.log(
        `Ignored the stored state ${state ?? null} of entry ${entry}: no state machine`,
      );
    }
  }

  private warn(warning: string | undefined, dropped: string[]): void {
    if (warning !== undefined) {
      this.logger.warn(warning);
    }
    if (dropped.length > 0) {
      this.logger.warn(
        `Dropped the stored values of ${dropped.join(', ')}, which no longer fit their declarations`,
      );
    }
  }
}
