import { describe, it, expect, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import FilesResolver from '../../src/files/files.resolver';
import LocalFilesService from '../../src/files/local/local-files.service';
import {
  pathToTestDirectory,
  pathToTestFileContent,
  testDirectory,
  testFileContent,
  MockConfigService,
} from '../testUtil';
import GitFilesService from '../../src/files/git/git-files.service';
import { FILE_SERVICE, IFilesService } from '../../src/files/interfaces/files.service.interface';
import FilesServiceFactory from '../../src/files/files-service.factory';

describe('Integration tests for FilesResolver', () => {
  let filesResolver: FilesResolver;
  let mockConfigService: MockConfigService;

  beforeEach(async () => {
    mockConfigService = new MockConfigService();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesResolver,
        {
          provide: FILE_SERVICE,
          useFactory: (
            configService: ConfigService,
            localFilesService: LocalFilesService,
            gitFilesService: GitFilesService,
          ) => {
            const fileServices = new Map<string, IFilesService>([
              [localFilesService.getFileMode(), localFilesService],
              [gitFilesService.getFileMode(), gitFilesService],
            ]);
            return FilesServiceFactory.create(configService, fileServices);
          },
          inject: [ConfigService, LocalFilesService, GitFilesService],
        },
        LocalFilesService,
        GitFilesService,
        { provide: ConfigService, useClass: MockConfigService },
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
