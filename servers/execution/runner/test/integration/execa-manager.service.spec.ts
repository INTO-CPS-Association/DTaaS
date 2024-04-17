import { describe, expect, it } from '@jest/globals';
import ExecaManager from 'src/execa-manager.service';
import { Manager, CommandStatus } from 'src/interfaces/command.interface';
import { ExecuteCommandDto } from 'src/dto/command.dto';
import Queue from 'src/queue.service';
import RunnerFactory from 'src/runner-factory.service';

describe('Check execution manager based on execa library', () => {
  it('Should create object', async () => {
    try {
      const dt: Manager = new ExecaManager(new Queue(), new RunnerFactory());
      expect(dt).toBeInstanceOf(ExecaManager);
    } catch (error) {
      expect(fail);
    }
  });

  it('Should execute a valid command', async () => {
    const dt: Manager = new ExecaManager(new Queue(), new RunnerFactory());
    let status: boolean = false;
    let logs: Map<string, string> = new Map<string, string>();

    [status, logs] = await dt.newCommand('create');

    expect(status).toBe(true);
    expect(logs.get('stdout')).toEqual(expect.any(String));
    expect(logs.get('stderr')).toEqual('');
  });

  it('Should not execute an invalid command', async () => {
    const dt: Manager = new ExecaManager(new Queue(), new RunnerFactory());
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
    const dt: Manager = new ExecaManager(new Queue(), new RunnerFactory());

    const commandStatus: CommandStatus = dt.checkStatus();
    expect(commandStatus).toEqual(expPhaseStatus);
  });

  it('Should hold correct history of command executions', async () => {
    const dt: Manager = new ExecaManager(new Queue(), new RunnerFactory());
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
