import type { CompletionEvent } from '../fsm/definition.js';
import type { ScriptResources } from '../resources/resources.js';
import type { EscalationTrigger } from './escalation.dto.js';
import type { CommandStateStatus } from './state.dto.js';

// The commands received since the runner started, by status
export type CommandCounts = Record<CommandStateStatus, number>;

// By command name, the CPU seconds of its runs since the runner started,
// summed, and the largest peak memory and process tree of one run; a
// command without a measured run is left out
export type ResourceTotals = Record<string, ScriptResources>;

// What the state machine did since the runner started: the entries into
// each state and the seconds spent in it, the scripts of the current
// entry that finished, and the requests that reached the machine
export type MachineMetricsDto = {
  entries: Record<string, number>;
  seconds: Record<string, number>;
  completions: Record<CompletionEvent, number>;
  transitions: { requested: number; accepted: number };
  events: { requested: number; accepted: number; noTransition: number };
};

export type EscalationCounts = Record<EscalationTrigger, number>;

// The reply of GET /metrics: counters since the process started, at
// since, which a restart resets. machine is null without a state
// machine; uptime is in whole seconds.
export type MetricsDto = {
  since: string;
  uptime: number;
  commands: CommandCounts;
  resources: ResourceTotals;
  machine: MachineMetricsDto | null;
  escalations: EscalationCounts;
};
