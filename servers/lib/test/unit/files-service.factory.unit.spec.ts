// files-service.factory.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import FilesServiceFactory from '../../src/files/services/files-service.factory';
import LocalFilesService from '../../src/files/services/local-files.service';
import GitlabFilesService from '../../src/files/services/gitlab-files.service';
import { IFilesService } from '../../src/files/interfaces/files.service.interface';

describe('FilesServiceFactory', () => {
  let serviceFactory: FilesServiceFactory;
  let configService: ConfigService;
  let localFilesService: IFilesService;
  let gitlabFilesService: IFilesService;

  beforeEach(async () => {
    localFilesService = new LocalFilesService(configService as ConfigService);
    gitlabFilesService = new GitlabFilesService(configService as ConfigService);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesServiceFactory,
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: LocalFilesService, useValue: localFilesService },
        { provide: GitlabFilesService, useValue: gitlabFilesService },
      ],
    }).compile();

    serviceFactory = module.get<FilesServiceFactory>(FilesServiceFactory);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should create a local files service when MODE is local', () => {
    jest.spyOn(configService, 'get').mockReturnValue('local');
    expect(serviceFactory.create()).toBe(localFilesService);
  });

  it('should create a gitlab files service when MODE is gitlab', () => {
    jest.spyOn(configService, 'get').mockReturnValue('gitlab');
    expect(serviceFactory.create()).toBe(gitlabFilesService);
  });

  it('should throw an error when MODE is invalid', () => {
    jest.spyOn(configService, 'get').mockReturnValue('invalid');
    expect(() => serviceFactory.create()).toThrowError(`Invalid MODE: invalid`);
  });
});
