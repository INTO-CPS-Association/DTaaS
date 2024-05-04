import { describe, it, expect } from '@jest/globals';
import Runner from 'src/interfaces/runner.interface';
import ExecaRunner from 'src/execa-runner';

describe('check command Runner based on execa library', () => {
  it('should execute a valid command', async () => {
    const cmdrunner: Runner = new ExecaRunner('date');

    expect(await cmdrunner.run()).toBe(true);
  });

  it('should attempt execution of an invalid command', async () => {
    const cmdrunner: Runner = new ExecaRunner('asdfghjkl');
    await cmdrunner.run();
  });

  it('should not succeed in execution of a command given in incorrect format', async () => {
    const cmdrunner: Runner = new ExecaRunner('asdfghjkl');
    const status: boolean = await cmdrunner.run();

    expect(status).toBe(false);
  });

  it('should capture single line output log', async () => {
    const cmdrunner: Runner = new ExecaRunner('date');

    const status: boolean = await cmdrunner.run();
    const logs: Map<string, string> = cmdrunner.checkLogs();

    expect(status).toBe(true);
    expect(logs.get('stdout')).toEqual(expect.any(String));
    expect(logs.get('stderr')).toEqual('');
  });
});
