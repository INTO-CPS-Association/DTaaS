import { Args, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql";
import { ConfigService } from "@nestjs/config";
import { join } from "path";

@Resolver("Project")
export class ProjectResolver {
  constructor(private configService: ConfigService) {}
  @Query()
  async project(@Args("fullPath") fullPath: string) {
    return { fullPath: fullPath };
  }
  @ResolveField()
  async repository(@Parent() project) {
    const dataPath = join(
      this.configService.get("LOCAL_PATH"),
      project.fullPath.split("/")[1],
    );

    return { dataPath: dataPath };
  }
}
