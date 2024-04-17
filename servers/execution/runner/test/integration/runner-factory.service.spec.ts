import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach } from '@jest/globals';
import RunnerFactoryService from 'src/runner-factory.service';

describe('RunnerFactoryService', () => {
  let service: RunnerFactoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RunnerFactoryService],
    }).compile();

    service = module.get<RunnerFactoryService>(RunnerFactoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
