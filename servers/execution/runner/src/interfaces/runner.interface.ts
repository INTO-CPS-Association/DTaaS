import type { ScriptResources } from '../resources/resources.js';

// How a run ended: stopped only when the runner stopped it
export type RunOutcome = 'success' | 'failed' | 'stopped';

// What a run passes to its script: input goes to stdin
export type RunOptions = { input?: string; env?: Record<string, string> };

export default interface Runner {
  run(options?: RunOptions): Promise<RunOutcome>;
  stop(): Promise<void>;
  checkLogs(): Map<string, string>;
  // null when the script did not exit by itself with a code
  checkExitCode(): number | null;
  // what the last run used, with null figures when not measured
  checkResources(): ScriptResources;
}
