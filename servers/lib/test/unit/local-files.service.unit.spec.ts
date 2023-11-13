import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import { join } from 'path';
import LocalFilesService from '../../src/files/services/local-files.service';
import {
  fstestFileContent,
  pathToTestDirectory,
  pathToTestFileContent,
  testFileArray,
  MockConfigService,
  testFileName,
} from '../testUtil';

jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
    lstat: jest.fn(),
    readFile: jest.fn(),
  },
}));

describe('LocalFilesService', () => {
  let service: LocalFilesService;
  const mockConfigService = new MockConfigService();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalFilesService,
        { provide: ConfigService, useValue: mockConfigService },
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
      mockConfigService.get('LOCAL_PATH'),
      pathToTestDirectory,
    );

    // Mock Stats value for lstat
    const statsMock: Partial<fs.Stats> = {
      isDirectory: () => true, // change this to false when you need a file instead of a directory
    };

    jest
      .spyOn(fs.promises, 'readdir')
      .mockResolvedValue(testFileArray as unknown as Promise<[]>);

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

  it('should read file', async () => {
    const fullPath = join(
      mockConfigService.get('LOCAL_PATH'),
      pathToTestFileContent,
    );

    jest.spyOn(fs.promises, 'readFile').mockResolvedValue(fstestFileContent);

    const result = await service.readFile(pathToTestFileContent);
    expect(result).toEqual({
      repository: {
        blobs: {
          nodes: [
            {
              name: testFileName,
              rawBlob: fstestFileContent,
              rawTextBlob: fstestFileContent,
            },
          ],
        },
      },
    });
    expect(fs.promises.readFile).toHaveBeenCalledWith(fullPath, 'utf8');
  });
});
