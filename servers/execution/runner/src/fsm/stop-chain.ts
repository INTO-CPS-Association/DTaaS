import ExecaManager from '../execa-manager.service.js';

// The stops of stop transitions, in order, so that a later one does not
// run its script while the script of an earlier one still exits
export default class StopChain {
  private pending: Promise<unknown> = Promise.resolve();

  constructor(private readonly manager: ExecaManager) {}

  // Runs run at once without a state left, so that it starts before the
  // caller returns, or else once the stopped script of the state left
  // has exited; manager.stop never rejects
  after(left: string | undefined, run: () => Promise<void>): void {
    if (left === undefined) {
      void run();
      return;
    }
    this.pending = this.pending.then(() => this.manager.stop(left));
    void this.pending.then(run);
  }
}
