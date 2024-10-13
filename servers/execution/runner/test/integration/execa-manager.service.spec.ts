import { Test, TestingModule } from '@nestjs/testing';
import { describe, expect, it, beforeEach } from '@jest/globals';
import ExecaManager from 'src/execa-manager.service';
import { Manager, CommandStatus } from 'src/interfaces/command.interface';
import { ExecuteCommandDto } from 'src/dto/command.dto';
import Queue from 'src/queue.service';
import Config from 'src/config/configuration.service';
import Keyv from 'keyv';
import {
  configFilename,
  nonExistingCommand,
  permittedCommand,
} from 'test/utils';

describe('Check execution manager based on execa library', () => {
  let dt: Manager;
  let config: Config;
  const CLIOptions: Keyv = new Keyv();

  beforeAll(async () => {
    await CLIOptions.set('configFile', configFilename);
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExecaManager, Queue, Config],
    }).compile();

    dt = module.get<Manager>(ExecaManager);
    config = module.get<Config>(Config);
    config.loadConfig(CLIOptions);
  });

  it('Should create object', async () => {
    try {
      expect(dt).toBeInstanceOf(ExecaManager);
    } catch (error) {
      expect(fail);
    }
  });

  it('Should execute a valid command', async () => {
    let status: boolean = false;
    let logs: Map<string, string> = new Map<string, string>();

    [status, logs] = await dt.newCommand(permittedCommand(config));

    expect(logs.get('stdout')).toEqual(expect.any(String));
    expect(logs.get('stderr')).toEqual('');
    expect(status).toBe(true);
  });

  it('Should not execute an invalid command', async () => {
    let status: boolean = true;
    let logs: Map<string, string> = new Map<string, string>();

    [status, logs] = await dt.newCommand(nonExistingCommand);

    expect(status).toBe(false);
    expect(logs.get('stdout')).toBeUndefined();
    expect(logs.get('stderr')).toBeUndefined();
  });

  it('Should return correct command execution status if there has been no prior command execution calls', async () => {
    const expStatus = {
      name: 'none',
      status: 'invalid',
      logs: {
        stdout: '',
        stderr: '',
      },
    };

    const commandStatus: CommandStatus = dt.checkStatus();
    expect(commandStatus).toEqual(expStatus);
  });

  it('Should hold correct history of command executions', async () => {
    const pastCommands: Array<ExecuteCommandDto> = [
      {
        name: 'create',
      },
      {
        name: 'non-existing-command',
      },
      {
        name: 'execute',
      },
    ];
    await Promise.all(
      pastCommands.map(async (command) => dt.newCommand(command.name)),
    );

    const pastCommandsActual = dt.checkHistory();

    expect(pastCommandsActual).toStrictEqual(pastCommands);
  });

  it('Should return correct command execution status for a series of commands', async () => {
    const commands = ['non-existing-command', 'create'];
    const commandStatus = await Promise.all(
      commands.map(async (command) => {
        const [status] = await dt.newCommand(command);
        return status;
      }),
    );

    expect(commandStatus).toEqual([false, true]);
  });
});
