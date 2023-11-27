import { InternalServerErrorException } from "@nestjs/common";
import { Args, Parent, ResolveField, Resolver } from "@nestjs/graphql";
import * as fs from "fs";
import { join } from "path";

@Resolver("Repository")
export class RepositoryResolver {
  @ResolveField()
  async tree(@Parent() repository, @Args("recursive") recursive: boolean) {
    const context = await fs.promises.readdir(repository.dataPath);
    console.log(recursive);

    return { dataPath: repository.dataPath, tree: context };
  }

  @ResolveField()
  async blobs(@Parent() repository, @Args("paths") paths: string[]) {
    const nodes = await Promise.all(
      paths.map(async (path) => {
        const fullpath = join(repository.dataPath, path);

        try {
          console.log(fullpath);

          const content = (await fs.promises.readFile(fullpath, "utf8")).trim();

          const name = path.split("/").pop(); // extract file name from the path

          return { name: name, rawBlob: content, rawTextBlob: content };
        } catch (error) {
          throw new InternalServerErrorException("Error reading file");
        }
      }),
    );
    console.log(nodes);

    return nodes;
  }
}
