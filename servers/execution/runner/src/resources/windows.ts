import { createInterface } from 'node:readline';
import type { Readable } from 'node:stream';
import { execa } from 'execa';
import { TreeTotals, walkTree } from './process-tree.js';
import {
  debugOnce,
  type ResourceWatch,
  type ScriptResources,
} from './resources.js';
import { parseRows, samplerScript } from './windows-tree.js';

// The sampler as started: its output, a way to end it, and its result
export type SamplerProcess = PromiseLike<{
  failed: boolean;
  isTerminated: boolean;
}> & {
  stdout: Readable;
  kill(): boolean;
};

const spawnSampler = (script: string): SamplerProcess =>
  execa(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-Command', script],
    { windowsHide: true, reject: false, buffer: { stdout: false } },
  );

// Adds the tree under the root of each line of the sampler to the totals
class SamplerWatch implements ResourceWatch {
  private readonly totals = new TreeTotals();

  private readonly log = debugOnce();

  constructor(
    private readonly sampler: SamplerProcess,
    private readonly pid: number,
  ) {}

  // Takes each line of the sampler, and logs a sampler that failed
  listen(): this {
    createInterface({ input: this.sampler.stdout }).on('line', (line) =>
      this.take(line),
    );
    void this.sampler.then(({ failed, isTerminated }) => {
      if (failed && !isTerminated) {
        this.log('The resource sampler failed');
      }
    });
    return this;
  }

  // Ends the sampler without waiting for it
  finish(): ScriptResources {
    this.sampler.kill();
    return this.totals.totals();
  }

  private take(line: string): void {
    const rows = parseRows(line);
    if (rows === undefined) {
      this.log(`Ignored a line of the resource sampler: ${line}`);
      return;
    }
    this.totals.add(walkTree(rows, this.pid));
  }
}

// Samples the process tree under a pid from the time just after its
// start
export function windowsSampler(
  pid: number,
  start: number,
  spawn = spawnSampler,
): ResourceWatch {
  return new SamplerWatch(spawn(samplerScript(pid, start)), pid).listen();
}
