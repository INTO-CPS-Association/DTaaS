// files-service.factory.spec.ts
import { describe, it, expect, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import FilesServiceFactory from '../../src/files/services/files-service.factory';
import LocalFilesService from '../../src/files/services/local-files.service';
import { IFilesService } from '../../src/files/interfaces/files.service.interface';
import GitFilesService from '../../src/files/services/git-files.service';

describe('FilesServiceFactory', () => {
  let serviceFactory: FilesServiceFactory;
  let configService: ConfigService;
  let localFilesService: IFilesService;

  beforeEach(async () => {
    localFilesService = new LocalFilesService(configService as ConfigService);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesServiceFactory,
        GitFilesService,
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: LocalFilesService, useValue: localFilesService },
      ],
    }).compile();

    serviceFactory = module.get<FilesServiceFactory>(FilesServiceFactory);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should create a local files service when MODE is local', () => {
    jest.spyOn(configService, 'get').mockReturnValue('local');
    expect(serviceFactory.create()).toBe(localFilesService);
  });

  it('should throw an error when MODE is invalid', () => {
    jest.spyOn(configService, 'get').mockReturnValue('invalid');
    expect(() => serviceFactory.create()).toThrow(`Invalid MODE: invalid`);
  });
});
