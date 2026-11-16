import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { storedResult } from 'src/command-result';
import { RunOutcome } from 'src/interfaces/runner.interface';
import Queue from 'src/queue.service';
import { NO_RESOURCES, ScriptResources } from 'src/resources/resources';

const figures = (
  cpuSeconds: number | null,
  peakRssBytes: number | null,
  processes: number | null = cpuSeconds === null ? null : 1,
): ScriptResources => ({ cpuSeconds, peakRssBytes, processes });

describe('Queue resources', () => {
  let queue: Queue;

  // Runs a command to its end with the figures given
  const run = (
    name: string,
    resources: ScriptResources,
    key?: string,
    outcome: RunOutcome = 'success',
  ): number => {
    const id = queue.enqueue(name, key);
    queue.complete(id, [outcome, new Map(), 0, resources]);
    return id;
  };

  beforeEach(() => {
    queue = new Queue();
  });

  afterEach(() => queue.close());

  it('Should store the figures of a command and show them', () => {
    const id = run('admit', figures(0.469, 115646464));

    expect(queue.activeCommand()).toMatchObject({
      id,
      resources: figures(0.469, 115646464),
    });
    expect(queue.history({ limit: 1 })[0].resources).toEqual(
      figures(0.469, 115646464),
    );
  });

  it('Should replay the stored figures to a repeated request', () => {
    run('admit', figures(1.5, 2048), 'key-1');

    const record = queue.findByKey('key-1');

    expect(record && storedResult(record)[3]).toEqual(figures(1.5, 2048));
  });

  it('Should have no figures while a command runs', () => {
    queue.enqueue('admit');

    expect(queue.activeCommand()?.resources).toEqual(NO_RESOURCES);
  });

  it('Should have no figures for an interrupted command', () => {
    queue.enqueue('admit');
    queue.markInterrupted(new Date().toISOString());

    expect(queue.activeCommand()).toMatchObject({
      status: 'interrupted',
      resources: NO_RESOURCES,
    });
  });

  it('Should total nothing before any measured run', () => {
    run('admit', NO_RESOURCES);
    queue.refuse(queue.enqueue('configure'));

    expect(queue.resourceTotals()).toStrictEqual({});
  });

  it('Should sum the CPU and keep the largest peak and tree by name', () => {
    run('admit', figures(1.219, 115646464, 3));
    run('admit', figures(0.812, 117440512, 2), undefined, 'failed');
    run('admit', NO_RESOURCES);
    run('open', figures(0.812, null));

    expect(queue.resourceTotals()).toStrictEqual({
      admit: figures(2.031, 117440512, 3),
      open: figures(0.812, null),
    });
  });

  it('Should total only the commands received since the start', () => {
    run('admit', figures(5, 4096));
    queue.markInterrupted(new Date().toISOString());
    run('admit', figures(0.25, 2048));

    expect(queue.resourceTotals()).toStrictEqual({
      admit: figures(0.25, 2048),
    });
  });
});
