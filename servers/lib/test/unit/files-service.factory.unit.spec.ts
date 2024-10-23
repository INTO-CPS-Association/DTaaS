// files-service.factory.spec.ts
import { describe, it, expect, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import FilesServiceFactory from '../../src/files/services/files-service.factory';
import LocalFilesService from '../../src/files/local/local-files.service';
import { IFilesService } from '../../src/files/interfaces/files.service.interface';
import GitFilesService from '../../src/files/git/git-files.service';

describe('FilesServiceFactory', () => {
  let configService: ConfigService;
  let localFilesService: IFilesService;
  let gitFilesService: IFilesService;
  let fileServices: Map<string, IFilesService>;

  beforeEach(async () => {
    localFilesService = new LocalFilesService(configService as ConfigService);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GitFilesService,
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: LocalFilesService, useValue: localFilesService },
      ],
    }).compile();

    configService = module.get<ConfigService>(ConfigService);
    gitFilesService = module.get<GitFilesService>(GitFilesService);
    fileServices = new Map<string, IFilesService>([
      [gitFilesService.getFileMode(), gitFilesService],
      [localFilesService.getFileMode(), localFilesService],
    ]);
  });

  it('should create a local files service when MODE is local', () => {
    jest.spyOn(configService, 'get').mockReturnValue('local');
    expect(FilesServiceFactory.create(configService, fileServices)).toBe(
      localFilesService,
    );
  });

  it('should throw an error when MODE is invalid', () => {
    jest.spyOn(configService, 'get').mockReturnValue('invalid');
    expect(() => FilesServiceFactory.create(configService, fileServices)).toThrow(`Invalid MODE: invalid`);
  });
});
