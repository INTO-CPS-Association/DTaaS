import { Resolver, Query, Args } from "@nestjs/graphql";
import { IFilesService } from "../files/interfaces/files.service.interface";
import { FilesServiceFactory } from "../files/services/files-service.factory";
import { Project, Tree } from "../types";

@Resolver()
export class FilesResolver {
  private readonly filesService: IFilesService;

  constructor(filesServiceFactory: FilesServiceFactory) {
    this.filesService = filesServiceFactory.create();
  }

  @Query((returns) => Project)
  async listDirectory(@Args("path") path: string): Promise<Project> {
    return this.filesService.listDirectory(path);
  }
}
