import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import FilesResolver from '../../src/files/resolvers/files.resolver';
import FilesServiceFactory from '../../src/files/services/files-service.factory';
import LocalFilesService from '../../src/files/services/local-files.service';
import GitlabFilesService from '../../src/files/services/gitlab-files.service';
import {
  pathToTestDirectory,
  pathToTestFileContent,
  testDirectory,
  testFileContent,
  MockConfigService,
} from '../testUtil';

describe('Integration tests for FilesResolver', () => {
  let filesResolver: FilesResolver;
  let mockConfigService: MockConfigService;

  beforeEach(async () => {
    mockConfigService = new MockConfigService();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesResolver,
        FilesServiceFactory,
        LocalFilesService,
        GitlabFilesService,
        { provide: ConfigService, useClass: MockConfigService },
      ],
    }).compile();

    filesResolver = module.get<FilesResolver>(FilesResolver);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const modes = ['local', 'gitlab'];

  // eslint-disable-next-line no-restricted-syntax
  for (const mode of modes) {
    // eslint-disable-next-line no-loop-func
    describe(`when MODE is ${mode}`, () => {
      beforeEach(() => {
        jest.spyOn(mockConfigService, 'get').mockReturnValue(mode);
      });

      it('should be defined', () => {
        expect(filesResolver).toBeDefined();
      });

      describe('listDirectory', () => {
        it('should list files', async () => {
          const files = await filesResolver.listDirectory(pathToTestDirectory);
          expect(files).toEqual(testDirectory);
        });
      });

      describe('readFile', () => {
        it('should read file', async () => {
          const content = await filesResolver.readFile(pathToTestFileContent);
          expect(content).toEqual(testFileContent);
        });
      });
    });
  }
});
