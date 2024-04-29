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
});
