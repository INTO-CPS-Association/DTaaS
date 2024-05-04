import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach } from '@jest/globals';
import Queue from 'src/queue.service';
import { Command } from 'src/interfaces/command.interface';
import RunnerFactory from 'src/runner-factory.service';

const commands: Command[] = [
  {
    name: 'hello',
    status: 'valid',
    task: RunnerFactory.create('cd .'),
  },
  {
    name: 'world',
    status: 'valid',
    task: RunnerFactory.create('cd .'),
  },
  {
    name: 'terminate',
    status: 'invalid',
    task: RunnerFactory.create('cd .'),
  },
];

describe('check Queue service', () => {
  let queue: Queue;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Queue],
    }).compile();

    queue = module.get<Queue>(Queue);
  });

  it('should store a command', async () => {
    expect(queue.enqueue(commands[0])).toBe(true);
  });

  it('should return active command as undefined when queue is empty', async () => {
    expect(queue.activeCommand()).toBe(undefined);
  });

  it('should return active command when queue is non-empty', async () => {
    queue.enqueue(commands[0]);

    expect(queue.activeCommand()).toBe(commands[0]);
  });

  it('should return correct active command when queue has more than one command', async () => {
    queue.enqueue(commands[0]);
    queue.enqueue(commands[1]);

    expect(queue.activeCommand()).toBe(commands[1]);
  });

  it('should return empty array when queue is empty', async () => {
    expect(queue.checkHistory()).toStrictEqual([]);
  });

  it('should return correct command history when queue has more than one command', async () => {
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
