import { describe, it, expect } from '@jest/globals';
import Queue from 'src/queue.service';
import { Command } from 'src/interfaces/command.interface';
import ExecaRunner from 'src/execaRunner';

const commands: Command[] = [
  {
    name: 'hello',
    status: 'valid',
    task: new ExecaRunner(''),
  },
  {
    name: 'world',
    status: 'valid',
    task: new ExecaRunner(''),
  },
  {
    name: 'terminate',
    status: 'invalid',
    task: new ExecaRunner(''),
  },
];

describe('check Queue service', () => {
  it('should store a command', async () => {
    const queue: Queue = new Queue();

    expect(queue.enqueue(commands[0])).toBe(true);
  });

  it('should return active command as undefined when queue is empty', async () => {
    const queue: Queue = new Queue();

    expect(queue.activePhase()).toBe(undefined);
  });

  it('should return active command when queue is non-empty', async () => {
    const queue: Queue = new Queue();

    queue.enqueue(commands[0]);

    expect(queue.activePhase()).toBe(commands[0]);
  });

  it('should return correct active command when queue has more than one command', async () => {
    const queue: Queue = new Queue();

    queue.enqueue(commands[0]);
    queue.enqueue(commands[1]);

    expect(queue.activePhase()).toBe(commands[1]);
  });
});
