import { Test, TestingModule } from '@nestjs/testing';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import Keyv from 'keyv';
import Config from 'src/config/configuration.service';
import ExecaManager from 'src/execa-manager.service';
import Queue from 'src/queue.service';
import { configFilename, commandNames } from 'test/utils';

// Each test runs a script, and PowerShell takes a second or more to
// start on a loaded Windows host
jest.setTimeout(30000);

describe('Execution manager across restarts', () => {
  let manager: ExecaManager;
  let queue: Queue;
  const CLIOptions: Keyv = new Keyv();

  beforeAll(async () => {
    await CLIOptions.set('configFile', configFilename);
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExecaManager, Queue, Config],
    }).compile();

    manager = module.get<ExecaManager>(ExecaManager);
    queue = module.get<Queue>(Queue);
    await module.get<Config>(Config).loadConfig(CLIOptions);
  });

  afterEach(() => queue.close());

  it('Should return failed for a command interrupted by a restart', async () => {
    queue.enqueue('create', 'key-1');
    queue.markInterrupted(new Date().toISOString());

    const [status, , exitCode] = await manager.newCommand('create', 'key-1');

    expect(status).toBe('failed');
    expect(exitCode).toBeNull();
    expect(commandNames(manager.checkHistory())).toStrictEqual(['create']);
  });

  // FsmService stores the status of a script a few microtasks after
  // the run settles
  it('Should close the database after a write that follows a run', async () => {
    const stored = { state: 'create', entry: 1, status: 'valid' } as const;
    const write = manager
      .newCommand('create')
      .then(() => undefined)
      .then(() => undefined)
      .then(() => queue.saveMachine(stored));
    await manager.onApplicationShutdown();

    await expect(write).resolves.toBeUndefined();
    expect(() => queue.loadMachine()).toThrow();
  });
});
