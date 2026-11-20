import type { EscalationData } from '../dto/escalation.dto.js';
import {
  COMPLETION_OF_STATUS,
  type FsmReplyDto,
  type FsmStateDto,
  type FsmStatus,
  type ScriptStatus,
} from '../dto/fsm.dto.js';
import type {
  EscalationCounts,
  MachineMetricsDto,
} from '../dto/metrics.dto.js';
import type { FsmRequest } from './requests.js';

// The machine as last observed, and when it entered its state, in
// milliseconds since the epoch
type Observed = {
  state: string | null;
  entry: number;
  status: ScriptStatus;
  enteredAt: number;
};

const copy = <T extends object>(counts: T): T => ({ ...counts });

const observedAt = (
  { state, entry, status }: FsmStateDto,
  enteredAt: number,
): Observed => ({ state, entry, status, enteredAt });

// Counts what the state machine does, from the signals of FsmService.
// The times are in milliseconds; StateMachine keeps no entry time, so
// this class does.
export default class Metrics {
  // undefined without a state machine
  private observed: Observed | undefined;

  private readonly entries: Record<string, number> = {};

  // the milliseconds spent in each state before its current entry
  private readonly spent: Record<string, number> = {};

  private readonly completions = { $success: 0, $failure: 0, $stopped: 0 };

  private readonly transitions = { requested: 0, accepted: 0 };

  private readonly events = { requested: 0, accepted: 0, noTransition: 0 };

  // The counters of each kind of request
  private readonly requests = {
    transition: this.transitions,
    event: this.events,
  };

  private readonly escalations: EscalationCounts = {
    request: 0,
    failure: 0,
    'no-transition': 0,
  };

  // The baseline: a restored machine is in its state from time on,
  // without an entry
  start(machine: FsmStateDto | undefined, time: number): void {
    this.observed = machine && observedAt(machine, time);
    this.track(machine?.state ?? null);
  }

  // A new entry, or a script of the current entry that left running
  observe(machine: FsmStateDto | undefined, now: number): void {
    const observed = this.observed;
    if (machine === undefined || observed === undefined) {
      return;
    }
    if (machine.entry === observed.entry) {
      this.complete(observed.status, machine.status);
    } else {
      this.enter(observed, machine, now);
    }
    observed.status = machine.status;
  }

  // A transition request, or an event request or raised event
  answered({ kind }: FsmRequest, { status }: FsmReplyDto): void {
    const counts = this.requests[kind];
    counts.requested += 1;
    this.countStatus(counts, status);
  }

  escalated({ trigger }: EscalationData): void {
    this.escalations[trigger] += 1;
  }

  // The counters at now, as copies
  report(now: number): {
    machine: MachineMetricsDto | null;
    escalations: EscalationCounts;
  } {
    return {
      machine: this.machineReport(now),
      escalations: copy(this.escalations),
    };
  }

  private machineReport(now: number): MachineMetricsDto | null {
    if (this.observed === undefined) {
      return null;
    }
    const spent = { ...this.spent };
    const { state, enteredAt } = this.observed;
    if (state !== null) {
      spent[state] += now - enteredAt;
    }
    const seconds = Object.entries(spent).map(([name, ms]) => [
      name,
      Math.round(ms) / 1000,
    ]);
    return {
      entries: copy(this.entries),
      seconds: Object.fromEntries(seconds),
      completions: copy(this.completions),
      transitions: copy(this.transitions),
      events: copy(this.events),
    };
  }

  // An accepted request, or an event without a transition
  private countStatus(counts: { accepted: number }, status: FsmStatus): void {
    if (status === 'accepted') {
      counts.accepted += 1;
    }
    if (status === 'no transition') {
      this.events.noTransition += 1;
    }
  }

  private complete(before: ScriptStatus, after: ScriptStatus): void {
    const event = COMPLETION_OF_STATUS[after];
    if (before === 'running' && event !== undefined) {
      this.completions[event] += 1;
    }
  }

  // Closes the time of the state left, and counts the entry
  private enter(observed: Observed, machine: FsmStateDto, now: number): void {
    if (observed.state !== null) {
      this.spent[observed.state] += now - observed.enteredAt;
    }
    this.track(machine.state);
    if (machine.state !== null) {
      this.entries[machine.state] += 1;
    }
    Object.assign(observed, observedAt(machine, now));
  }

  // Gives a state its counters, at zero the first time
  private track(state: string | null): void {
    if (state !== null) {
      this.entries[state] ??= 0;
      this.spent[state] ??= 0;
    }
  }
}
