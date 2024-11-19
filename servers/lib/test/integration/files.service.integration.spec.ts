import { describe, it, expect, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import FilesResolver from '../../src/files/files.resolver';
import LocalFilesService from '../../src/files/local/local-files.service';
import {
  pathToTestDirectory,
  pathToTestFileContent,
  testDirectory,
  testFileContent,
} from '../testUtil';
import GitFilesService from '../../src/files/git/git-files.service';
import { FILE_SERVICE } from '../../src/files/interfaces/files.service.interface';
import FilesServiceFactory from '../../src/files/files-service.factory';
import { CONFIG_MODE } from 'src/enums/config-mode.enum';
import { CONFIG_SERVICE, IConfig } from 'src/config/config.interface';
import { GitRepo } from 'src/config/config.model';

describe('Integration tests for FilesResolver', () => {
  let filesResolver: FilesResolver;
  let mockConfigService: IConfig;

  beforeEach(async () => {
    mockConfigService = {
      getMode: jest.fn<() => string>().mockReturnValue(CONFIG_MODE.LOCAL),
      getLocalPath: jest.fn<() => string>().mockReturnValue('test/data'),
      getApolloPath: jest.fn<() => string>(),
      getGitRepos: jest.fn<() => { [key: string]: GitRepo }[]>(),
      getGraphqlPlayground: jest.fn<() => string>(),
      getLogLevel: jest.fn<() => string>(),
      getPort: jest.fn<() => number>(),
      loadConfig: jest.fn<() => Promise<void>>(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesResolver,
        {
          provide: FILE_SERVICE,
          useFactory: async (
            configService: IConfig,
            localFilesService: LocalFilesService,
            gitFilesService: GitFilesService,
          ) => {
            const fileServices = [localFilesService, gitFilesService];
            return await FilesServiceFactory.create(
              configService,
              fileServices,
            );
          },
          inject: [CONFIG_SERVICE, LocalFilesService, GitFilesService],
        },
        LocalFilesService,
        GitFilesService,
        { provide: CONFIG_SERVICE, useValue: mockConfigService },
      ],
    }).compile();

    filesResolver = module.get<FilesResolver>(FilesResolver);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const modes = ['local'];

  // eslint-disable-next-line no-restricted-syntax
  for (const mode of modes) {
    // eslint-disable-next-line no-loop-func
    describe(`when MODE is ${mode}`, () => {
      beforeEach(() => {
        jest.spyOn(mockConfigService, 'getMode').mockImplementation(() => mode);
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
