import { describe, expect, it } from '@jest/globals';
import LifeCycleManager from 'src/lifecycleManager.service';
import { Manager, CommandStatus } from 'src/interfaces/lifecycle.interface';
import { UpdatePhaseDto } from 'src/dto/phase.dto';

describe('Check LifecycleManager', () => {
  it('Should create object', async () => {
    try {
      const dt: Manager = new LifeCycleManager();
      expect(dt).toBeInstanceOf(LifeCycleManager);
    } catch (error) {
      expect(fail);
    }
  });

  it('Should change to valid phase', async () => {
    const dt: Manager = new LifeCycleManager();
    let status: boolean = false;
    let logs: Map<string, string> = new Map<string, string>();

    [status, logs] = await dt.changePhase('create');

    expect(status).toBe(true);
    expect(logs.get('stdout')).toEqual(expect.any(String));
    expect(logs.get('stderr')).toEqual('');
  });

  it('Should not change to invalid phase', async () => {
    const dt: Manager = new LifeCycleManager();
    let status: boolean = true;

    [status] = await dt.changePhase('asdfghjkl');

    expect(status).toBe(false);
  });

  it('Should return correct phase status if there has been no changePhase calls', async () => {
    const expPhaseStatus = {
      name: 'none',
      status: 'invalid',
      logs: {
        stdout: '',
        stderr: '',
      },
    };
    const dt: Manager = new LifeCycleManager();

    const commandStatus: CommandStatus = dt.checkPhase();
    expect(commandStatus).toEqual(expPhaseStatus);
  });

  it('Should hold correct phase history', async () => {
    const dt: Manager = new LifeCycleManager();
    const status: boolean[] = [];
    const pastPhases: Array<UpdatePhaseDto> = [
      {
        name: 'date',
      },
      {
        name: 'whoami',
      },
    ];

    pastPhases.map(async (phase) => {
      await dt.changePhase(phase.name).then(([value]) => {
        status.push(value);
      });
    });

    const pastPhasesActual = dt.checkHistory();

    expect(pastPhasesActual).toStrictEqual(pastPhases);
  });
});
