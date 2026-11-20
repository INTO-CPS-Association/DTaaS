import { type ProcessRow, TreeTotals } from './process-tree.js';
import {
  debugOnce,
  type ResourceWatch,
  type ScriptResources,
} from './resources.js';

// Milliseconds between two samples
export const SAMPLE_MS = 500;

// Reads the process tree of a run at once and then every interval, and
// adds each tree read to the totals. A read still pending when the timer
// fires skips that tick; the timer does not hold the process open.
export default class PollingWatch implements ResourceWatch {
  private readonly totals = new TreeTotals();

  private reading = false;

  private readonly timer: NodeJS.Timeout;

  private readonly log = debugOnce();

  constructor(
    private readonly read: () => Promise<ProcessRow[]>,
    intervalMs = SAMPLE_MS,
  ) {
    this.timer = setInterval(() => this.sample(), intervalMs);
    this.timer.unref();
    this.sample();
  }

  finish(): ScriptResources {
    clearInterval(this.timer);
    return this.totals.totals();
  }

  private sample(): void {
    if (this.reading) {
      return;
    }
    this.reading = true;
    void this.read()
      .then(
        (tree) => this.totals.add(tree),
        (error: unknown) => this.log(`A resource read failed: ${error}`),
      )
      .finally(() => {
        this.reading = false;
      });
  }
}
