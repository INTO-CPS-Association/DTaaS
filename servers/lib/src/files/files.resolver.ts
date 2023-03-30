import { Resolver, Query, Args } from "@nestjs/graphql";
import { FilesService } from "./files.service";

// The FilesResolver class uses the FilesService class to fetch the file names, which encapsulates the business logic for handling files.
@Resolver(() => String)
export class FilesResolver {
  // The constructor takes an instance of the FilesService as parameter, which is the service that handles all of the business logic
  constructor(private readonly filesService: FilesService) {}

  @Query(() => [String])
  //getFiles, calls Wrapper function, which handles this query depending on the mode (local or gitlab)
  async getFiles(@Args("path") path: string): Promise<string[]> {
    return this.filesService.Wrapper(path);
  }
}
