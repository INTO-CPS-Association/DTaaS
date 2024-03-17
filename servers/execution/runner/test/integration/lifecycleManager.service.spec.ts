import { describe, expect, it } from '@jest/globals';
import LifeCycleManager from 'src/lifecycleManager.service';
import { DTLifeCycle, Phase } from 'src/interfaces/lifecycle.interface';
import ExecaCMDRunner from 'src/execaCMDRunner';

describe('Check LifecycleManager', () => {
  it('Should create object', async () => {
    try {
      const dt: DTLifeCycle = new LifeCycleManager();
      expect(dt).toBeInstanceOf(LifeCycleManager);
    } catch (error) {
      expect(fail);
    }
  });

  it('Should change to valid phase', async () => {
    const dt: DTLifeCycle = new LifeCycleManager();
    let status: boolean = false;
    let logs: Map<string, string> = new Map<string, string>();

    [status, logs] = await dt.changePhase('create');

    expect(status).toBe(true);
    expect(logs.get('stdout')).toEqual(expect.any(String));
    expect(logs.get('stderr')).toEqual('');
  });

  it('Should not change to invalid phase', async () => {
    const dt: DTLifeCycle = new LifeCycleManager();
    let status: boolean = true;

    [status] = await dt.changePhase('asdfghjkl');

    expect(status).toBe(false);
  });

  it('Should return undefined if there has been no changePhase calls', async () => {
    const dt: DTLifeCycle = new LifeCycleManager();
    let phase: Phase | undefined = {
      name: 'hello',
      status: 'valid',
      task: new ExecaCMDRunner(''),
    };

    phase = dt.checkPhase();

    expect(phase).toBe(undefined);
  });

  it('Should hold correct phase history', async () => {
    const dt: DTLifeCycle = new LifeCycleManager();
    const status: boolean[] = [];
    const pastPhases: Array<string> = ['date', 'whoami'];

    dt.changePhase(pastPhases[0]).then(([value]) => {
      status.push(value);
    });
    dt.changePhase(pastPhases[1]).then(([value]) => {
      status.push(value);
    });

    const pastPhasesActual = dt.checkHistory();

    expect(pastPhasesActual).toStrictEqual(pastPhases);
  });
});
