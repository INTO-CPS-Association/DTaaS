import { resolve } from 'node:path';
import { describe, it, expect, jest } from '@jest/globals';
import Runner, { RunOutcome } from 'src/interfaces/runner.interface';
import ExecaRunner from 'src/execa-runner';
import RunnerFactory from 'src/runner-factory.service';
import { scriptEnvironment } from 'src/fsm/script-context';
import { nonExistingCommand } from 'test/utils';

// The stop tests run scripts, and PowerShell takes a second or more to
// start on a loaded Windows host
jest.setTimeout(30000);

// Windows ends powershell.exe at once, so SIGTERM handling is POSIX only
const itOnPosix = process.platform === 'win32' ? it.skip : it;

const delay = (ms: number) =>
  new Promise((done) => {
    setTimeout(done, ms);
  });

// A test script of the script folder that runs until it is stopped
const looping = (script: string, stopGrace?: number) =>
  RunnerFactory.create(resolve('script', script), {
    stopGrace,
  }) as ExecaRunner;

describe('check command Runner based on execa library', () => {
  it('should execute a valid command', async () => {
    const cmdrunner: Runner = new ExecaRunner(process.execPath, ['--version']);

    expect(await cmdrunner.run()).toBe('success');
  });

  it('should attempt but not succeed in execution of an invalid command', async () => {
    const cmdrunner: Runner = new ExecaRunner(nonExistingCommand);
    const status: RunOutcome = await cmdrunner.run();

    expect(status).toBe('failed');
    expect(cmdrunner.checkLogs().get('stdout')).toBe('');
  });

  // Windows reports exit code 1 for a missing executable
  itOnPosix(
    'should have no exit code for a command that could not start',
    async () => {
      const cmdrunner: Runner = new ExecaRunner(nonExistingCommand);
      await cmdrunner.run();

      expect(cmdrunner.checkExitCode()).toBeNull();
    },
  );

  describe('input and exit code', () => {
    it('should write the input to stdin', async () => {
      const runner = looping('echo-input');

      expect(await runner.run({ input: '{"ward":"B"}\n' })).toBe('success');
      expect(JSON.parse(runner.stdout)).toEqual({ ward: 'B' });
      expect(runner.checkExitCode()).toBe(0);
    });

    it('should close stdin without input', async () => {
      const runner = looping('echo-input');

      expect(await runner.run()).toBe('success');
      expect(runner.stdout).toBe('');
    });

    it('should run a script that does not read a large input', async () => {
      const runner = looping('create');
      const input = `${JSON.stringify({ text: 'x'.repeat(65000) })}\n`;

      expect(await runner.run({ input })).toBe('success');
    });

    it('should keep the exit code and logs of a failing script', async () => {
      const runner = looping('fail');

      expect(await runner.run()).toBe('failed');
      expect(runner.checkExitCode()).toBe(3);
      expect(runner.checkLogs().get('stderr')).toBe('no free bed');
    });
  });

  it('should capture single line output log', async () => {
    const cmdrunner: Runner = new ExecaRunner(process.execPath, ['--version']);

    const status: RunOutcome = await cmdrunner.run();
    const logs: Map<string, string> = cmdrunner.checkLogs();

    expect(status).toBe('success');
    expect(logs.get('stdout')).toEqual(expect.any(String));
    expect(logs.get('stderr')).toEqual('');
  });

  describe('environment', () => {
    // scriptEnvironment inherits PATH and SystemRoot from the runner, as
    // /bin/sh and powershell.exe need them to start
    it('Should give a script the environment built for it', async () => {
      const runner = RunnerFactory.create(resolve('script', 'print-context'));
      const env = scriptEnvironment({
        id: 'dt-1',
        command: 'print-context',
        state: 'print-context',
        entry: 1,
        values: { scope: 'multi' },
      });

      expect(await runner.run({ env })).toBe('success');
      expect(runner.checkLogs().get('stdout')?.trim()).toBe(
        'dt-1 print-context 1 multi',
      );
    });

    it('Should not add the environment of the runner to it', async () => {
      const runner = new ExecaRunner(process.execPath, [
        '-e',
        'process.stdout.write(process.env.RUNNER_TEST_OUTSIDE ?? "unset")',
      ]);
      const { PATH, SystemRoot } = process.env;
      const env = scriptEnvironment({
        id: 'dt-1',
        command: 'node',
        inherited: { PATH, SystemRoot },
      });
      process.env.RUNNER_TEST_OUTSIDE = 'outside';

      try {
        expect(await runner.run({ env })).toBe('success');
      } finally {
        delete process.env.RUNNER_TEST_OUTSIDE;
      }
      expect(runner.checkLogs().get('stdout')).toBe('unset');
    });
  });

  describe('stop', () => {
    it('should end a looping script as stopped', async () => {
      const runner = looping('loop');
      const run = runner.run();

      await runner.stop();

      expect(await run).toBe('stopped');
      expect(runner.checkExitCode()).toBeNull();
    });

    it('should stop only once when asked twice', async () => {
      const runner = looping('loop');
      const run = runner.run();

      await Promise.all([runner.stop(), runner.stop()]);

      expect(await run).toBe('stopped');
    });

    it('should do nothing before the script runs or after it ended', async () => {
      const runner = new ExecaRunner(process.execPath, ['--version']);
      await runner.stop();

      expect(await runner.run()).toBe('success');
      await runner.stop();
    });

    it('should count a script killed from outside as failed', async () => {
      const runner = looping('loop');
      const run = runner.run();

      process.kill(runner['subprocess']?.pid as number);

      expect(await run).toBe('failed');
      // Windows ends the process with exit code 1, POSIX with a signal
      expect(runner.checkExitCode()).toBe(
        process.platform === 'win32' ? 1 : null,
      );
    });

    itOnPosix(
      'should kill a script that ignores SIGTERM after the grace period',
      async () => {
        const runner = looping('ignore-term', 500);
        const run = runner.run();
        // let the shell set its trap before the stop
        await delay(300);

        const started = Date.now();
        await runner.stop();

        expect(Date.now() - started).toBeGreaterThanOrEqual(450);
        expect(await run).toBe('stopped');
      },
    );
  });
});
