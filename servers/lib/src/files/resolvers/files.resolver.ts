import { Resolver, Query, Args } from '@nestjs/graphql';
import { IFilesService } from '../interfaces/files.service.interface';
import FilesServiceFactory from '../services/files-service.factory';
import { Project } from '../../types';

@Resolver()
export default class FilesResolver {
  private readonly filesService: IFilesService;

  constructor(filesServiceFactory: FilesServiceFactory) {
    this.filesService = filesServiceFactory.create();
  }

  @Query(() => Project)
  async listDirectory(@Args('path') path: string): Promise<Project> {
    return this.filesService.listDirectory(path);
  }

  @Query(() => Project)
  async readFile(@Args('path') path: string): Promise<Project> {
    return this.filesService.readFile(path);
  }
}
