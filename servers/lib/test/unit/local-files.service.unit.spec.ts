import { describe, it, expect, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import * as fs from 'fs';
import { join } from 'path';
import LocalFilesService from '../../src/files/local/local-files.service';
import {
  fstestFileContent,
  pathToTestDirectory,
  pathToTestFileContent,
  testFileName,
  pathToLargeTestFileContent,
  largeFstestFileContent,
  largeTestFileName,
  jestMockConfigService,
  testFileArray,
} from '../testUtil';

import { CONFIG_SERVICE } from 'src/config/config.interface';

jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
    lstat: jest.fn(),
    readFile: jest.fn(),
  },
}));

describe('LocalFilesService', () => {
  let service: LocalFilesService;
  let mockConfigService;

  beforeEach(async () => {
    mockConfigService = jestMockConfigService();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalFilesService,
        { provide: CONFIG_SERVICE, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<LocalFilesService>(LocalFilesService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should list directory', async () => {
    const fullPath = join(
      mockConfigService.getLocalPath(),
      pathToTestDirectory,
    );

    // Mock Stats value for lstat
    const statsMock: Partial<fs.Stats> = {
      isDirectory: () => true, // change this to false when you need a file instead of a directory
    };

    jest.spyOn(fs.promises, 'readdir').mockResolvedValue(testFileArray as any);

    jest.spyOn(fs.promises, 'lstat').mockImplementation((pathToDirectory) => {
      if (typeof pathToDirectory === 'string') {
        return Promise.resolve(statsMock as fs.Stats);
      }
      throw new Error(`Invalid argument: ${pathToDirectory}`);
    });
    const result = await service.listDirectory(pathToTestDirectory);
    expect(result).toEqual({
      repository: {
        tree: {
          trees: {
            edges: testFileArray.map((file) => ({
              node: { name: file, type: 'tree' },
            })),
          },
          blobs: { edges: [] },
        },
      },
    });
    expect(fs.promises.readdir).toHaveBeenCalledWith(fullPath);
    expect(fs.promises.lstat).toHaveBeenCalledTimes(testFileArray.length);
  });

  const readTestFile = [
    {
      name: largeTestFileName,
      filePath: pathToLargeTestFileContent,
      expectedContent: largeFstestFileContent,
    },
    {
      name: testFileName,
      filePath: pathToTestFileContent,
      expectedContent: fstestFileContent,
    },
  ];

  readTestFile.forEach(({ name, filePath, expectedContent }) => {
    it(`should read file ${name}`, async () => {
      const fullPath = join(mockConfigService.getLocalPath(), filePath);

      jest.spyOn(fs.promises, 'readFile').mockResolvedValue(expectedContent);

      const result = await service.readFile(filePath);
      expect(result).toEqual({
        repository: {
          blobs: {
            nodes: [
              {
                name: name,
                rawBlob: expectedContent,
                rawTextBlob: expectedContent,
              },
            ],
          },
        },
      });
      expect(fs.promises.readFile).toHaveBeenCalledWith(fullPath, 'utf8');
    });
  });
});
