import { Test, TestingModule } from '@nestjs/testing';
import { FilesResolver } from './files.resolver';

describe('FilesResolver', () => {
  let resolver: FilesResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FilesResolver],
    }).compile();

    resolver = module.get<FilesResolver>(FilesResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
