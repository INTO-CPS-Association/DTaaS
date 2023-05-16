import { Resolver, Query, Args } from "@nestjs/graphql";
import { FilesService } from "./services/files.service";
import { PathDto } from "./dtos/path.dto";

@Resolver(() => String)
export class FilesResolver {
  constructor(private readonly filesService: FilesService) {}

  @Query(() => [String])
  async listDirectory(@Args() pathDto: PathDto): Promise<string[]> {
    return this.filesService.listDirectory(pathDto.path);
  }

  @Query(() => [String])
  async readFile(@Args() pathDto: PathDto): Promise<string[]> {
    return this.filesService.readFile(pathDto.path);
  }
}
