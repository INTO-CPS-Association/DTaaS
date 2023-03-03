import { Resolver, Query, Args } from '@nestjs/graphql';
import { FilesService } from './files.service';
import { ConfigService } from '@nestjs/config';


// The FilesResolver class uses the FilesService class to fetch the file names, which encapsulates the business logic for handling files.
@Resolver()
export class FilesResolver {

  // The constructor takes an instance of the FilesService as parameter, which is the service that handles all of the business logic
  constructor(
    private readonly filesService: FilesService,
    private readonly configService: ConfigService) {}

  // FilesResolver class a single query called getFiles. 
  // This query takes a path argument, which represents a directory path, and returns an array of file names in that directory
  @Query(() => [String])
  // getFiles, calls getFilesInDirectory, which returns an array of file names
  async getFiles(@Args('path') path: string): Promise<string[]> {
    console.log(path);
    return this.filesService.getFilesInDirectory(path);
  }


}

