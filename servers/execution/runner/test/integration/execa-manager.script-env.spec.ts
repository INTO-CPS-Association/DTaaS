import { Test } from '@nestjs/testing';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import Keyv from 'keyv';
import Config from 'src/config/configuration.service';
import ExecaManager from 'src/execa-manager.service';
import Runner, {
  RunOptions,
  RunOutcome,
} from 'src/interfaces/runner.interface';
import Queue from 'src/queue.service';
import RunnerFactory from 'src/runner-factory.service';
import { NO_RESOURCES } from 'src/resources/resources';
import { configFilename } from 'test/utils';

describe('Execution manager options of a run', () => {
  let manager: ExecaManager;
  let queue: Queue;
  const run = jest.fn((_options?: RunOptions) =>
    Promise.resolve<RunOutcome>('success'),
  );

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ExecaManager, Queue, Config],
    }).compile();
    manager = module.get<ExecaManager>(ExecaManager);
    queue = module.get<Queue>(Queue);
    const options = new Keyv();
    await options.set('configFile', configFilename);
    await module.get<Config>(Config).loadConfig(options);
    const runner = {
      run,
      stop: jest.fn(),
      checkLogs: () => new Map(),
      checkExitCode: () => 0,
      checkResources: () => NO_RESOURCES,
    };
    jest
      .spyOn(RunnerFactory, 'create')
      .mockReturnValue(runner as unknown as Runner);
  });

  afterEach(() => {
    queue.close();
    run.mockClear();
    jest.restoreAllMocks();
  });

  it('Should hand the options to the run of a new command', async () => {
    await manager.newCommand('create', undefined, { env: { DT_ID: 'dt-1' } });

    expect(run).toHaveBeenCalledWith({ env: { DT_ID: 'dt-1' } });
  });

  it('Should run once for a request that joins a running command', async () => {
    let finish = () => {};
    run.mockImplementationOnce(
      () =>
        new Promise<RunOutcome>((resolve) => {
          finish = () => resolve('success');
        }),
    );
    const first = manager.newCommand('create', undefined, { env: { A: '1' } });
    const joined = manager.newCommand('create', undefined, { env: { A: '2' } });

    finish();
    await Promise.all([first, joined]);

    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith({ env: { A: '1' } });
  });

  it('Should run once for a repeated request key', async () => {
    await manager.newCommand('create', 'key-1', { env: { A: '1' } });
    await manager.newCommand('create', 'key-1', { env: { A: '2' } });

    expect(run).toHaveBeenCalledTimes(1);
  });
});
