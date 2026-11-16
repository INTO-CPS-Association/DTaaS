import { PassThrough } from 'node:stream';
import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { NO_RESOURCES } from 'src/resources/resources';
import { SamplerProcess, windowsSampler } from 'src/resources/windows';
import { samplerScript } from 'src/resources/windows-tree';

type Ending = { failed: boolean; isTerminated: boolean };

// A sampler whose output the test writes, and which ends as the test says
function fakeSampler() {
  const stdout = new PassThrough();
  let end: (ending: Ending) => void = () => undefined;
  const ended = new Promise<Ending>((resolve) => {
    end = resolve;
  });
  const kill = jest.fn(() => true);
  const sampler: SamplerProcess = Object.assign(ended, { stdout, kill });
  const spawn = jest.fn((_script: string) => sampler);
  // the lines reach the watch through readline, a few turns later
  const print = async (...lines: string[]) => {
    stdout.write(lines.map((line) => `${line}\r\n`).join(''));
    await new Promise(setImmediate);
  };
  return { spawn, kill, print, end };
}

// The root 4242, a child of it, and a process of another tree, with the
// CPU time of the root and the child in 100 ns
const line = (rootTicks: number, childTicks: number, childSet = 4096) =>
  [
    `4242 1000 500 ${rootTicks} 0 2048 2`,
    `5000 4242 600 ${childTicks} 0 ${childSet} 4`,
    `6000 1000 400 90000000 0 999999 999`,
  ].join(';');

describe('Windows sampler', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('Should start one sampler for the pid and start time', () => {
    const { spawn } = fakeSampler();

    windowsSampler(4242, 1761576000123, spawn);

    expect(spawn).toHaveBeenCalledTimes(1);
    expect(spawn).toHaveBeenCalledWith(samplerScript(4242, 1761576000123));
  });

  it('Should measure the tree under the pid in each line', async () => {
    const { spawn, print } = fakeSampler();
    const watch = windowsSampler(4242, 0, spawn);

    await print(line(1000000, 2000000), line(2000000, 4000000, 8192));

    expect(watch.finish()).toEqual({
      cpuSeconds: 0.6,
      peakRssBytes: 2048 + 8192,
      processes: 2,
    });
  });

  it('Should take the final CPU time of the root after its exit', async () => {
    const { spawn, print } = fakeSampler();
    const watch = windowsSampler(4242, 0, spawn);

    await print(line(1000000, 2000000), '4242 0 500 3000000 0 0 0');

    expect(watch.finish()).toMatchObject({ cpuSeconds: 0.5, processes: 2 });
  });

  it('Should have no memory for a root seen only after its exit', async () => {
    const { spawn, print } = fakeSampler();
    const watch = windowsSampler(4242, 0, spawn);

    await print('4242 0 500 12031250 0 0 0');

    expect(watch.finish()).toEqual({
      cpuSeconds: 1.203,
      peakRssBytes: null,
      processes: 1,
    });
  });

  it('Should ignore a malformed line and log it once', async () => {
    const debug = jest
      .spyOn(Logger.prototype, 'debug')
      .mockImplementation(() => undefined);
    const { spawn, print } = fakeSampler();
    const watch = windowsSampler(4242, 0, spawn);

    await print(line(10000000, 0), '19375000  ', '1,5 2048 2048');

    expect(debug).toHaveBeenCalledTimes(1);
    expect(watch.finish()).toMatchObject({ cpuSeconds: 1 });
  });

  it('Should kill the sampler on finish without waiting for it', () => {
    const { spawn, kill } = fakeSampler();
    const watch = windowsSampler(4242, 0, spawn);

    expect(watch.finish()).toBe(NO_RESOURCES);
    expect(kill).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['log a sampler that failed', true, false, 1],
    ['not log a sampler that it killed', true, true, 0],
    ['not log a sampler that ended', false, false, 0],
  ])('Should %s', async (_, failed, isTerminated, logs) => {
    const debug = jest
      .spyOn(Logger.prototype, 'debug')
      .mockImplementation(() => undefined);
    const { spawn, end } = fakeSampler();
    windowsSampler(4242, 0, spawn);

    end({ failed, isTerminated });
    await new Promise(setImmediate);

    expect(debug).toHaveBeenCalledTimes(logs);
  });
});
