import { Resolver, Query, Args } from "@nestjs/graphql";
import { IFilesService } from "../files/interfaces/files.service.interface";
import { FilesServiceFactory } from "../files/services/files-service.factory";

@Resolver()
export class FilesResolver {
  private readonly filesService: IFilesService;

  constructor(filesServiceFactory: FilesServiceFactory) {
    this.filesService = filesServiceFactory.create();
  }

  @Query(() => [String])
  async listDirectory(@Args("path") path: string): Promise<string[]> {
    return (await this.filesService.listDirectory(path)).sort();
  }

  @Query(() => [String])
  async readFile(@Args("path") path: string): Promise<string[]> {
    return this.filesService.readFile(path);
  }

  @Query((returns) => Project)
  async readFile(@Args("path") path: string): Promise<Project> {
    return this.filesService.readFile(path);
  }
}
