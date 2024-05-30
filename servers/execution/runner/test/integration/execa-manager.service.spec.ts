import { Test, TestingModule } from '@nestjs/testing';
import { describe, expect, it, beforeEach } from '@jest/globals';
import ExecaManager from 'src/execa-manager.service';
import { Manager, CommandStatus } from 'src/interfaces/command.interface';
import { ExecuteCommandDto } from 'src/dto/command.dto';
import Queue from 'src/queue.service';
import Config from 'src/config/configuration.service';

describe('Check execution manager based on execa library', () => {
  let dt: Manager;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExecaManager, Queue, Config],
    }).compile();

    dt = module.get<Manager>(ExecaManager);
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

    [status, logs] = await dt.newCommand('create');

    expect(status).toBe(true);
    expect(logs.get('stdout')).toEqual(expect.any(String));
    expect(logs.get('stderr')).toEqual('');
  });

  it('Should not execute an invalid command', async () => {
    let status: boolean = true;

    [status] = await dt.newCommand('asdfghjkl');

    expect(status).toBe(false);
  });

  it('Should return correct command execution status if there has been no changePhase calls', async () => {
    const expPhaseStatus = {
      name: 'none',
      status: 'invalid',
      logs: {
        stdout: '',
        stderr: '',
      },
    };

    const commandStatus: CommandStatus = dt.checkStatus();
    expect(commandStatus).toEqual(expPhaseStatus);
  });

  it('Should hold correct history of command executions', async () => {
    const status: boolean[] = [];
    const pastPhases: Array<ExecuteCommandDto> = [
      {
        name: 'date',
      },
      {
        name: 'whoami',
      },
    ];

    pastPhases.map(async (command) => {
      await dt.newCommand(command.name).then(([value]) => {
        status.push(value);
      });
    });

    const pastPhasesActual = dt.checkHistory();

    expect(pastPhasesActual).toStrictEqual(pastPhases);
  });
});
