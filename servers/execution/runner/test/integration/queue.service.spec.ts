import { describe, it, expect } from '@jest/globals';
import Queue from 'src/queue.service';
import { Command } from 'src/interfaces/command.interface';
import ExecaRunner from 'src/execa-runner';

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

    expect(queue.activeCommand()).toBe(undefined);
  });

  it('should return active command when queue is non-empty', async () => {
    const queue: Queue = new Queue();

    queue.enqueue(commands[0]);

    expect(queue.activeCommand()).toBe(commands[0]);
  });

  it('should return correct active command when queue has more than one command', async () => {
    const queue: Queue = new Queue();

    queue.enqueue(commands[0]);
    queue.enqueue(commands[1]);

    expect(queue.activeCommand()).toBe(commands[1]);
  });

  it('should return empty array when queue is empty', async () => {
    const queue: Queue = new Queue();

    expect(queue.checkHistory()).toStrictEqual([]);
  });

  it('should return correct command history when queue has more than one command', async () => {
    const queue: Queue = new Queue();
    const history = [
      {
        name: 'hello',
      },
      {
        name: 'world',
      },
    ];
    queue.enqueue(commands[0]);
    queue.enqueue(commands[1]);

    expect(queue.checkHistory()).toStrictEqual(history);
  });
});
