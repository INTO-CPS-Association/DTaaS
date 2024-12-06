import { describe, it, expect, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import LocalFileService from 'src/files/local/local-files.service';
import { Project } from 'src/types';
import {
  jestMockConfigService,
  testDirectory,
  testFileContent,
} from 'test/testUtil';
import GitFilesService from 'src/files/git/git-files.service';
import { CONFIG_MODE } from 'src/enums/config-mode.enum';
import { IFilesService } from 'src/files/interfaces/files.service.interface';
import { CONFIG_SERVICE } from 'src/config/config.interface';

jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
    lstat: jest.fn(),
    readFile: jest.fn(),
  },
}));

describe('GitFilesService', () => {
  let service: GitFilesService;
  const mockConfigService = jestMockConfigService();
  const mockLocalFilesService: IFilesService = {
    listDirectory: jest
      .fn<() => Promise<Project>>()
      .mockResolvedValue(testDirectory),
    readFile: jest
      .fn<() => Promise<Project>>()
      .mockImplementation(() => Promise.resolve(testFileContent)),
    getMode: jest.fn<() => CONFIG_MODE>().mockReturnValue(CONFIG_MODE.LOCAL),
    init: jest.fn<() => Promise<void>>(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GitFilesService,
        { provide: CONFIG_SERVICE, useValue: mockConfigService },
        { provide: LocalFileService, useValue: mockLocalFilesService },
      ],
    }).compile();

    service = module.get<GitFilesService>(GitFilesService);
    process.env.MODE = service.getMode();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should call list directory in localService', async () => {
    // Arrange
    const mockListDirectory = jest.spyOn(
      mockLocalFilesService,
      'listDirectory',
    );

    // Act
    await service.listDirectory('/some/path');

    // Assert
    expect(mockListDirectory).toHaveBeenCalledTimes(1);
  });

  it('should call read file in localService', async () => {
    // Arrange
    const mockReadFile = jest.spyOn(mockLocalFilesService, 'readFile');

    // Act
    await service.readFile('/some/path/file.txt');

    // Assert
    expect(mockReadFile).toHaveBeenCalledTimes(1);
  });
});
