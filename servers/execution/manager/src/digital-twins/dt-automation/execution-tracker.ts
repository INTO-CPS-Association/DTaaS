import type { DTExecutionResult } from '@into-cps-association/dt-automation';
import { Observable, Subject } from 'rxjs';

export type ExecutionSource = {
  executions(): DTExecutionResult[];
  subscribe(listener: () => void): () => void;
  checkRunningExecutions(): Promise<void>;
};

function fingerprint(execution: DTExecutionResult): string {
  const logLength = execution.jobLogs.reduce(
    (sum, log) => sum + log.log.length,
    0,
  );
  return `${execution.status}:${execution.jobLogs.length}:${logLength}`;
}

export default class ExecutionTracker {
  private readonly changes$ = new Subject<DTExecutionResult>();

  private fingerprints = new Map<string, string>();

  private timer: NodeJS.Timeout | undefined;

  private unsubscribe: (() => void) | undefined;

  constructor(
    private readonly source: ExecutionSource,
    private readonly checkInterval: number,
  ) {}

  start(): void {
    this.unsubscribe = this.source.subscribe(() => this.publishChanges());
    this.timer = setInterval(() => {
      void this.source.checkRunningExecutions();
    }, this.checkInterval);
    this.timer.unref();
  }

  stop(): void {
    if (this.timer !== undefined) clearInterval(this.timer);
    this.unsubscribe?.();
    this.timer = undefined;
    this.unsubscribe = undefined;
    this.changes$.complete();
  }

  changes(): Observable<DTExecutionResult> {
    return this.changes$.asObservable();
  }

  private publishChanges(): void {
    const current = new Map<string, string>();
    for (const execution of this.source.executions()) {
      const print = fingerprint(execution);
      current.set(execution.id, print);
      if (this.fingerprints.get(execution.id) !== print) {
        this.changes$.next(execution);
      }
    }
    this.fingerprints = current;
  }
}
