import { resolve } from 'node:path';
import { describe, expect, it, jest } from '@jest/globals';
import ExecaRunner from 'src/execa-runner';
import RunnerFactory from 'src/runner-factory.service';
import { Meter, NO_RESOURCES } from 'src/resources/resources';

// PowerShell takes a second or more to start on a loaded Windows host,
// and the sampler is a second one
jest.setTimeout(60000);

const MEGABYTE = 1024 * 1024;

// Each platform measures its own way, so each case runs on its own
const itOnLinux = process.platform === 'linux' ? it : it.skip;
const itOnWindows = process.platform === 'win32' ? it : it.skip;

const script = (name: string, stopGrace?: number) =>
  RunnerFactory.create(resolve('script', name), { stopGrace });

const delay = (ms: number) =>
  new Promise((done) => {
    setTimeout(done, ms);
  });

describe('Resources of a script run', () => {
  itOnLinux('Should measure the CPU and memory of busy on Linux', async () => {
    const runner = script('busy');

    expect(await runner.run()).toBe('success');
    const { cpuSeconds, peakRssBytes } = runner.checkResources();
    expect(cpuSeconds).toBeGreaterThan(0.3);
    expect(peakRssBytes).toBeGreaterThan(MEGABYTE);
  });

  itOnWindows('Should measure the CPU and memory of busy.ps1', async () => {
    const runner = script('busy');

    expect(await runner.run()).toBe('success');
    const { cpuSeconds, peakRssBytes } = runner.checkResources();
    expect(cpuSeconds).toBeGreaterThan(0.3);
    expect(peakRssBytes).toBeGreaterThan(MEGABYTE);
  });

  it('Should measure nothing without a meter', async () => {
    const runner = new ExecaRunner(process.execPath, ['--version']);

    expect(runner.checkResources()).toBe(NO_RESOURCES);
    expect(await runner.run()).toBe('success');
    expect(runner.checkResources()).toBe(NO_RESOURCES);
  });

  it('Should give the meter the pid and the start of the run', async () => {
    const figures = { cpuSeconds: 0.25, peakRssBytes: 4096, processes: 1 };
    const finish = jest.fn(() => figures);
    const meter = jest.fn<Meter>(() => ({ finish }));
    const runner = new ExecaRunner(process.execPath, ['--version'], { meter });
    const before = Date.now();

    await runner.run();

    expect(meter).toHaveBeenCalledWith(expect.any(Number), expect.any(Number));
    expect(meter.mock.calls[0][1]).toBeGreaterThanOrEqual(before);
    expect(finish).toHaveBeenCalledTimes(1);
    expect(runner.checkResources()).toEqual(figures);
  });

  it('Should not delay a stop', async () => {
    const runner = script('loop', 500);
    const run = runner.run();
    await delay(1000);

    const started = Date.now();
    await runner.stop();

    expect(Date.now() - started).toBeLessThan(2000);
    expect(await run).toBe('stopped');
  });
});
