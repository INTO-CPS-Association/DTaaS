import { resolve } from 'node:path';
import { describe, expect, it, jest } from '@jest/globals';
import RunnerFactory from 'src/runner-factory.service';

// PowerShell takes a second or more to start on a loaded Windows host,
// and spawn-busy.ps1 starts a second one besides the sampler
jest.setTimeout(60000);

// Linux and Windows measure the tree, each its own way; other platforms
// measure nothing
const describeMeasured = ['linux', 'win32'].includes(process.platform)
  ? describe
  : describe.skip;

// The direct child of spawn-busy only waits: sh on Linux; on Windows
// powershell.exe, which uses well under a second to start
const SHELL_SECONDS = process.platform === 'win32' ? 1 : 0.1;

// Linux samples at the start; on Windows the first sample waits for the
// sampler's own powershell.exe, which takes several seconds on a host
// loaded by the other test workers
const FIRST_SAMPLE_MS = process.platform === 'win32' ? 10000 : 3000;

const script = (name: string, stopGrace?: number) =>
  RunnerFactory.create(resolve('script', name), { stopGrace });

const delay = (ms: number) =>
  new Promise((done) => {
    setTimeout(done, ms);
  });

describeMeasured('Resources of a process tree', () => {
  it('Should count the CPU time of the children', async () => {
    const runner = script('spawn-busy');

    expect(await runner.run()).toBe('success');
    const { cpuSeconds, processes } = runner.checkResources();
    expect(cpuSeconds).toBeGreaterThan(SHELL_SECONDS + 0.3);
    expect(processes).toBeGreaterThanOrEqual(2);
  });

  it('Should report the figures of a stopped run', async () => {
    const runner = script('loop', 500);
    const run = runner.run();
    await delay(FIRST_SAMPLE_MS);

    const started = Date.now();
    await runner.stop();

    expect(Date.now() - started).toBeLessThan(2000);
    expect(await run).toBe('stopped');
    expect(runner.checkResources()).toEqual({
      cpuSeconds: expect.any(Number),
      peakRssBytes: expect.any(Number),
      processes: expect.any(Number),
    });
  });
});
