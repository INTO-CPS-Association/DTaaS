import { Resolver, Query, Args } from '@nestjs/graphql';
import {
  FILE_SERVICE,
  IFilesService,
} from '../interfaces/files.service.interface.js';
import { Project } from '../../types.js';
import { Inject } from '@nestjs/common';

@Resolver()
export default class FilesResolver {
  constructor(
    @Inject(FILE_SERVICE) private readonly filesService: IFilesService,
  ) {}

  @Query(() => Project)
  async listDirectory(@Args('path') path: string): Promise<Project> {
    return this.filesService.listDirectory(path);
  }

  @Query(() => Project)
  async readFile(@Args('path') path: string): Promise<Project> {
    return this.filesService.readFile(path);
  }
}
