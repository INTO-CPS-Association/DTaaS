import { describe, it, expect } from '@jest/globals';
import Queue from 'src/queue.service';
import { Command } from 'src/interfaces/lifecycle.interface';
import ExecaCMDRunner from 'src/execaCMDRunner';

const phases: Command[] = [
  {
    name: 'hello',
    status: 'valid',
    task: new ExecaCMDRunner(''),
  },
  {
    name: 'world',
    status: 'valid',
    task: new ExecaCMDRunner(''),
  },
  {
    name: 'terminate',
    status: 'invalid',
    task: new ExecaCMDRunner(''),
  },
];

describe('check Queue service', () => {
  it('should store a phase', async () => {
    const queue: Queue = new Queue();

    expect(queue.enqueue(phases[0])).toBe(true);
  });

  it('should return active phase as undefined when queue is empty', async () => {
    const queue: Queue = new Queue();

    expect(queue.activePhase()).toBe(undefined);
  });

  it('should return active phase when queue is non-empty', async () => {
    const queue: Queue = new Queue();

    queue.enqueue(phases[0]);

    expect(queue.activePhase()).toBe(phases[0]);
  });

  it('should return correct active phase when queue has more than one phase', async () => {
    const queue: Queue = new Queue();

    queue.enqueue(phases[0]);
    queue.enqueue(phases[1]);

    expect(queue.activePhase()).toBe(phases[1]);
  });
});
