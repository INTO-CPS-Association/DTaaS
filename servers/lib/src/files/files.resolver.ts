import { Resolver, Query, Args } from "@nestjs/graphql";
import { FilesService } from "./interfaces/files.service";
import path from "path";

@Resolver(() => String)
export class FilesResolver {
  constructor(private readonly filesService: FilesService) {}

  @Query(() => [String])
  async listDirectory(@Args() path: string): Promise<string[]> {
    return this.filesService.listDirectory(path);
  }

  @Query(() => [String])
  async readFile(@Args() path: string): Promise<string[]> {
    return this.filesService.readFile(path);
  }
}
