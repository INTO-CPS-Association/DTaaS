import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { Project } from "../graphql";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class ProjectService {
  constructor(private configService: ConfigService) {}
  async getProject(fullPath: string): Promise<Project> {
    try {
      const mode = this.configService.get<string>("MODE");
      if (mode === "gitlab") {
        try {
          return { fullPath: "test" };
          // const pathParts: string[] = fullPath.split("/");
          // const gitlabGroup: string = pathParts[0];
          // const project: string = pathParts[1];

          // const response = await axios({
          //   url: "https://gitlab.com/api/graphql",
          //   method: "post",
          //   headers: {
          //     "Content-Type": "application/json",
          //     Authorization: `Bearer ${this.configService.get("GITLAB_TOKEN")}`,
          //   },
          //   data: {
          //     query,
          //   },
          // });
          // return response.data.data.project;
        } catch (error) {
          throw new Error("Invalid query"); // Throw error instead of returning string
        }
      } else if (mode === "local") {
        return { fullPath: fullPath };
      } else {
        throw new Error(`Invalid MODE: ${mode}`);
      }
    } catch (error) {
      throw new InternalServerErrorException("Error reading file");
    }
  }
}
