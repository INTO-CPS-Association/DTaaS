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
      'linux',
    ) as ExecaRunner;

    expect(runner.command).toBe('scripts/create');
    expect(runner.args).toEqual([]);
  });

  it('should run the PowerShell version of the script on Windows', () => {
    const runner = RunnerFactory.create(
      'scripts/create',
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
  });
});
