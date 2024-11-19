// files-service.factory.spec.ts
import { describe, it, expect, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import FilesServiceFactory from '../../src/files/files-service.factory';
import LocalFilesService from '../../src/files/local/local-files.service';
import { IFilesService } from '../../src/files/interfaces/files.service.interface';
import GitFilesService from '../../src/files/git/git-files.service';
import { CONFIG_SERVICE, IConfig } from 'src/config/config.interface';
import { jestMockConfigService } from 'test/testUtil';
import { CONFIG_MODE } from 'src/enums/config-mode.enum';

describe('FilesServiceFactory', () => {
  let configService: IConfig;
  let localFilesService: IFilesService;
  let gitFilesService: IFilesService;
  let fileServices: IFilesService[];

  beforeEach(async () => {
    configService = jestMockConfigService();
    gitFilesService = { getMode: jest.fn<() => CONFIG_MODE>().mockReturnValue(CONFIG_MODE.GIT), init: jest.fn<() => Promise<void>>() } as unknown as IFilesService;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {provide: GitFilesService, useValue: gitFilesService},
        {
          provide: CONFIG_SERVICE,
          useValue: configService,
        },
        LocalFilesService,
      ],
    }).compile();

    localFilesService = module.get<LocalFilesService>(LocalFilesService);
    gitFilesService = module.get<GitFilesService>(GitFilesService);
    fileServices = [gitFilesService, localFilesService];
  });

  it('should create a local files service when MODE is local', async () => {
    jest.spyOn(configService, 'getMode').mockReturnValue('local');
    expect(await FilesServiceFactory.create(configService, fileServices)).toBe(
      localFilesService,
    );
  });

  it('should create a git files service when MODE is git', async () => {
    jest.spyOn(configService, 'getMode').mockReturnValue(CONFIG_MODE.GIT);
    expect(await FilesServiceFactory.create(configService, fileServices)).toBe(
      gitFilesService,
    );
  });

  it('should throw an error when MODE is invalid', async () => {
    const invalidMode = 'invalid';
    jest.spyOn(configService, 'getMode').mockReturnValue(invalidMode);
    await expect(FilesServiceFactory.create(configService, fileServices)).rejects.toThrow(`Invalid MODE: ${invalidMode}`);
  });
});
