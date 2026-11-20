import { Test, TestingModule } from '@nestjs/testing';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import Keyv from 'keyv';
import { CommandRefused } from 'src/dto/command.dto';
import ExecaManager from 'src/execa-manager.service';
import Queue from 'src/queue.service';
import Config from 'src/config/configuration.service';
import {
  configFilename,
  nonExistingCommand,
  commandNames,
  MEASURED,
} from 'test/utils';

// Each test runs scripts, and PowerShell takes a second or more to start
// on a loaded Windows host
jest.setTimeout(30000);

const input = (value: unknown) => ({ input: `${JSON.stringify(value)}\n` });

describe('Command input and outcome of the execution manager', () => {
  let manager: ExecaManager;
  let queue: Queue;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExecaManager, Queue, Config],
    }).compile();

    manager = module.get<ExecaManager>(ExecaManager);
    queue = module.get<Queue>(Queue);
    const options = new Keyv();
    await options.set('configFile', configFilename);
    await module.get<Config>(Config).loadConfig(options);
  });

  afterEach(() => queue.close());

  it('Should pass the input to the script', async () => {
    const [status, logs, exitCode] = await manager.newCommand(
      'echo-input',
      undefined,
      input({ ward: 'B' }),
    );

    expect(status).toBe('success');
    expect(exitCode).toBe(0);
    expect(JSON.parse(logs.get('stdout') as string)).toEqual({ ward: 'B' });
  });

  it('Should store the caller with the command it starts', async () => {
    const enqueue = jest.spyOn(queue, 'enqueue');

    await manager.newCommand('create', 'key-1', { by: 'alice' });

    expect(enqueue).toHaveBeenCalledWith('create', 'key-1', 'alice');
  });

  it('Should report and store a failing script with its exit code', async () => {
    const [status, logs, exitCode] = await manager.newCommand('fail');

    expect([status, exitCode]).toEqual(['failed', 3]);
    expect(logs.get('stderr')).toBe('no free bed');
    expect(manager.checkStatus()).toMatchObject({
      status: 'failed',
      exitCode: 3,
    });
  });

  it('Should refuse input for a running command without keeping it', async () => {
    const run = manager.newCommand('loop');

    await expect(
      manager.newCommand('loop', 'key-1', input({ ward: 'B' })),
    ).rejects.toEqual(new CommandRefused('command running'));
    await manager.stop('loop');

    expect((await run)[0]).toBe('stopped');
    expect(queue.findByKey('key-1')).toBeUndefined();
    expect(commandNames(manager.checkHistory())).toStrictEqual(['loop']);
  });

  it('Should join a running command without input', async () => {
    const first = manager.newCommand('loop');
    const second = manager.newCommand('loop');
    await manager.stop('loop');

    expect(await second).toEqual(await first);
    expect(await first).toEqual(['stopped', expect.any(Map), null, MEASURED]);
  });

  it('Should replay a repeated request key whatever its input', async () => {
    const first = await manager.newCommand(
      'echo-input',
      'key-1',
      input({ ward: 'B' }),
    );
    const repeat = await manager.newCommand(
      'echo-input',
      'key-1',
      input({ ward: 'C' }),
    );

    expect(repeat).toEqual(first);
    expect(commandNames(manager.checkHistory())).toStrictEqual(['echo-input']);
  });

  it('Should replay a stored failure with its exit code', async () => {
    await manager.newCommand('fail', 'key-1');
    queue.enqueue('create');

    const [status, , exitCode] = await manager.newCommand('fail', 'key-1');

    expect([status, exitCode]).toEqual(['failed', 3]);
  });

  it('Should refuse a repeat of a command that is not permitted', async () => {
    const refused = new CommandRefused('invalid command');
    await expect(
      manager.newCommand(nonExistingCommand, 'key-1'),
    ).rejects.toEqual(refused);

    await expect(
      manager.newCommand(nonExistingCommand, 'key-1'),
    ).rejects.toEqual(refused);
    expect(manager.checkHistory()).toHaveLength(1);
  });
});
