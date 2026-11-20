import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach } from '@jest/globals';
import RunnerFactory from 'src/runner-factory.service';
import Runner from 'src/interfaces/runner.interface';
import ExecaRunner from 'src/execa-runner';

describe('Check RunnerFactoryService', () => {
  let service: RunnerFactory;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RunnerFactory],
    }).compile();

    service = module.get<RunnerFactory>(RunnerFactory);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create new ExecaRunner object', () => {
    const runner: Runner = RunnerFactory.create('cd .');
    expect(runner).toBeInstanceOf(ExecaRunner);
  });

  it('should run the script directly on Linux', () => {
    const runner = RunnerFactory.create(
      'scripts/create',
      { stopGrace: 1000 },
      'linux',
    ) as ExecaRunner;

    expect(runner.command).toBe('scripts/create');
    expect(runner.args).toEqual([]);
    expect(runner.options).toEqual({
      stopGrace: 1000,
      meter: expect.any(Function),
    });
  });

  it('should run the PowerShell version of the script on Windows', () => {
    const runner = RunnerFactory.create(
      'scripts/create',
      { stopGrace: 1000 },
      'win32',
    ) as ExecaRunner;

    expect(runner.command).toBe('powershell.exe');
    expect(runner.args).toEqual([
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      'scripts/create.ps1',
    ]);
    expect(runner.options).toEqual({
      stopGrace: 1000,
      meter: expect.any(Function),
    });
  });

  it('should start the script through setpriv with a script account', () => {
    const account = {
      name: 'dt-script',
      uid: 999,
      gid: 986,
      home: '/',
      groups: [986],
    };
    const user = { account, runDirectory: '/var/lib/dt/run' };
    const runner = RunnerFactory.create(
      '/srv/dt/scripts/create',
      { stopGrace: 1000, user },
      'linux',
    ) as ExecaRunner;

    expect(runner.command).toBe('/usr/bin/setpriv');
    expect(runner.args.slice(0, 2)).toEqual(['--reuid=999', '--regid=986']);
    expect(runner.args.slice(-2)).toEqual(['--', '/srv/dt/scripts/create']);
    expect(runner.options).toEqual({
      stopGrace: 1000,
      meter: expect.any(Function),
      cwd: '/var/lib/dt/run',
    });
  });
});
