// files-service.factory.spec.ts
import { describe, it, expect, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import FilesServiceFactory from '../../src/files/files-service.factory';
import LocalFilesService from '../../src/files/local/local-files.service';
import { IFilesService } from '../../src/files/interfaces/files.service.interface';
import GitFilesService from '../../src/files/git/git-files.service';
import Config from 'src/config/config.service';

describe('FilesServiceFactory', () => {
  let configService: Config;
  let localFilesService: IFilesService;
  let gitFilesService: IFilesService;
  let fileServices: IFilesService[];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GitFilesService,
        { provide: Config, useValue: { getMode: jest.fn() } },
        LocalFilesService,
      ],
    }).compile();

    configService = module.get<Config>(Config);
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
    jest.spyOn(configService, 'getMode').mockReturnValue('git');
    expect(await FilesServiceFactory.create(configService, fileServices)).toBe(
      gitFilesService,
    );
  });

  it('should throw an error when MODE is invalid', () => {
    jest.spyOn(configService, 'getMode').mockReturnValue('invalid');
    expect(async () =>
      await FilesServiceFactory.create(configService, fileServices),
    ).toThrow(`Invalid MODE: invalid`);
  });
});
