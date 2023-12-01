import { Args, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql";
import { ConfigService } from "@nestjs/config";
import { join } from "path";
import { ProjectService } from "../services/project.service";

@Resolver("Project")
export class ProjectResolver {
  constructor(
    private readonly configService: ConfigService,
    private readonly projectService: ProjectService,
  ) {}
  @Query()
  async project(@Args("fullPath") fullPath: string, @Args("input") input: any) {
    console.log("fullPath", input);

    return this.projectService.getProject(fullPath);
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
