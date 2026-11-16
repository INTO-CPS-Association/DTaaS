import type { FsmStateDto, ScriptStatus } from '../dto/fsm.dto.js';
import { Definition, Transition } from './definition.js';

// The current state of a digital twin and the transitions out of it.
// Each entry into a state has a number, so that the completion of the
// script of an earlier entry can be told apart. A machine restored after
// a restart starts in its stored state and entry.
export default class StateMachine {
  constructor(
    private readonly definition: Definition,
    private current?: string,
    private entries = 0,
  ) {}

  get state(): string | undefined {
    return this.current;
  }

  get entry(): number {
    return this.entries;
  }

  get events(): string[] {
    return [...this.definition.events].sort((a, b) => a.localeCompare(b));
  }

  hasState(state: string): boolean {
    return this.definition.states.has(state);
  }

  hasEvent(event: string): boolean {
    return this.definition.events.has(event);
  }

  // The machine as GET /fsm shows it, with the status of its script
  describe(status: ScriptStatus): FsmStateDto {
    return {
      state: this.current ?? null,
      status,
      entry: this.entries,
      events: this.events,
    };
  }

  next(event: string): Transition | undefined {
    if (this.current === undefined) {
      return undefined;
    }
    return this.definition.states.get(this.current)?.get(event);
  }

  enter(state: string): number {
    this.current = state;
    this.entries += 1;
    return this.entries;
  }
}
