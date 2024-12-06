import { describe, it, expect, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import FilesResolver from '../../src/files/files.resolver';
import {
  testDirectory,
  pathToTestDirectory,
  pathToTestFileContent,
  testFileContent,
} from '../testUtil';
import {
  FILE_SERVICE,
  IFilesService,
} from '../../src/files/interfaces/files.service.interface';
import { Project } from 'src/types';
import { CONFIG_MODE } from '../../src/enums/config-mode.enum';

describe('Unit tests for FilesResolver', () => {
  let filesResolver: FilesResolver;
  let filesService: IFilesService;

  beforeEach(async () => {
    const mockFilesService: IFilesService = {
      listDirectory: jest
        .fn<() => Promise<Project>>()
        .mockResolvedValue(testDirectory),
      readFile: jest
        .fn<() => Promise<Project>>()
        .mockImplementation(() => Promise.resolve(testFileContent)),
      getMode: jest.fn<() => CONFIG_MODE>().mockReturnValue(CONFIG_MODE.LOCAL),
      init: jest.fn<() => Promise<void>>(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesResolver,
        {
          provide: FILE_SERVICE,
          useFactory: () => {
            return mockFilesService;
          },
        },
      ],
    }).compile();

    filesResolver = module.get<FilesResolver>(FilesResolver);
    filesService = module.get<IFilesService>(FILE_SERVICE);
  });

  it('should be defined', () => {
    expect(filesResolver).toBeDefined();
  });

  describe('listDirectory', () => {
    it('should be defined', () => {
      expect(filesResolver.listDirectory).toBeDefined();
    });

    it('should list files in directory', async () => {
      const result = await filesResolver.listDirectory(pathToTestDirectory);
      expect(result).toEqual(testDirectory);
      expect(filesService.listDirectory).toHaveBeenCalledWith(
        pathToTestDirectory,
      );
    });
  });

  describe('readFile', () => {
    it('should be defined', () => {
      expect(filesResolver.readFile).toBeDefined();
    });

    it('should read file', async () => {
      const result = await filesResolver.readFile(pathToTestFileContent);
      expect(result).toEqual(testFileContent);
      expect(filesService.readFile).toHaveBeenCalledWith(pathToTestFileContent);
    });
  });
});
