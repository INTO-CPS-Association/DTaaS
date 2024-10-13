import { describe, it, expect } from '@jest/globals';
import Runner from 'src/interfaces/runner.interface';
import ExecaRunner from 'src/execa-runner';
import { nonExistingCommand } from 'test/utils';

describe('check command Runner based on execa library', () => {
  it('should execute a valid command', async () => {
    const cmdrunner: Runner = new ExecaRunner('date');

    expect(await cmdrunner.run()).toBe(true);
  });

  it('should attempt but not succeed in execution of an invalid command', async () => {
    const cmdrunner: Runner = new ExecaRunner(nonExistingCommand);
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
