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
import { configFilename, nonExistingCommand, commandNames } from 'test/utils';

// Each test runs scripts, and PowerShell takes a second or more to start
// on a loaded Windows host
jest.setTimeout(30000);

describe('Stopping the runs of the execution manager', () => {
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

  it('Should stop a named run and leave the others running', async () => {
    const loop = manager.newCommand('loop');
    const other = manager.newCommand('ignore-term');

    expect(await manager.stop('loop')).toEqual(['loop']);

    expect(manager.isRunning('loop')).toBe(false);
    expect(manager.isRunning('ignore-term')).toBe(true);
    expect((await loop)[0]).toBe('stopped');
    await manager.stop();
    expect((await other)[0]).toBe('stopped');
  });

  it('Should stop every run without a name', async () => {
    const runs = [
      manager.newCommand('loop'),
      manager.newCommand('ignore-term'),
    ];

    expect(await manager.stop()).toEqual(['loop', 'ignore-term']);

    expect(manager.isRunning('loop')).toBe(false);
    expect(manager.isRunning('ignore-term')).toBe(false);
    expect((await Promise.all(runs)).map(([outcome]) => outcome)).toEqual([
      'stopped',
      'stopped',
    ]);
  });

  it('Should stop nothing when nothing runs', async () => {
    expect(await manager.stop()).toEqual([]);
    expect(await manager.stop('loop')).toEqual([]);
  });

  it('Should have nothing to stop for a command that is not permitted', async () => {
    const refused = expect(
      manager.newCommand(nonExistingCommand),
    ).rejects.toEqual(new CommandRefused('invalid command'));

    expect(await manager.stop()).toEqual([]);
    await refused;
  });

  it('Should record a stopped run as stopped', async () => {
    const run = manager.newCommand('loop', 'key-1');
    await manager.stop('loop');
    await run;

    expect(queue.findByKey('key-1')).toMatchObject({
      status: 'stopped',
      finished: true,
    });
    expect(manager.checkStatus()).toMatchObject({ status: 'stopped' });
  });

  it('Should answer a repeated request key of a stopped run with stopped', async () => {
    const run = manager.newCommand('loop', 'key-1');
    await manager.stop('loop');
    await run;

    const [outcome] = await manager.newCommand('loop', 'key-1');

    expect(outcome).toBe('stopped');
    expect(commandNames(manager.checkHistory())).toStrictEqual(['loop']);
  });

  it('Should answer a request joined to a stopped run with stopped', async () => {
    const first = manager.newCommand('loop');
    const joined = manager.newCommand('loop', 'key-2');
    await manager.stop('loop');

    expect((await first)[0]).toBe('stopped');
    expect((await joined)[0]).toBe('stopped');
    expect(commandNames(manager.checkHistory())).toStrictEqual(['loop']);
  });

  it('Should run the script again after a stop', async () => {
    const first = manager.newCommand('loop');
    await manager.stop('loop');
    const second = manager.newCommand('loop');

    expect(manager.isRunning('loop')).toBe(true);
    await manager.stop('loop');
    expect((await Promise.all([first, second])).map(([o]) => o)).toEqual([
      'stopped',
      'stopped',
    ]);
    expect(commandNames(manager.checkHistory())).toStrictEqual([
      'loop',
      'loop',
    ]);
  });
});
