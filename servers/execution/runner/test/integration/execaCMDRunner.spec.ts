import { describe, it, expect } from '@jest/globals';
import CMDRunner from 'src/interfaces/CMDRunner.interface';
import ExecaCMDRunner from 'src/execaCMDRunner';

describe('check Execa CMD Runner', () => {
  it('should execute a valid operating system command', async () => {
    const cmdrunner: CMDRunner = new ExecaCMDRunner('date');

    expect(await cmdrunner.run()).toBe(true);
  });

  it('should attempt execution of an invalid command', async () => {
    const cmdrunner: CMDRunner = new ExecaCMDRunner('asdfghjkl');
    await cmdrunner.run();
  });

  it('should not succeed in execution of an invalid command too', async () => {
    const cmdrunner: CMDRunner = new ExecaCMDRunner('asdfghjkl');
    const status: boolean = await cmdrunner.run();

    expect(status).toBe(false);
  });

  it('should capture single line output log', async () => {
    const cmdrunner: CMDRunner = new ExecaCMDRunner('date');

    const status: boolean = await cmdrunner.run();
    const logs: Map<string, string> = cmdrunner.checkLogs();

    expect(status).toBe(true);
    expect(logs.get('stdout')).toEqual(expect.any(String));
    expect(logs.get('stderr')).toEqual('');
  });
});
