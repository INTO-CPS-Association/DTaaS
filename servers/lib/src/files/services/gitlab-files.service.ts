import { Injectable } from "@nestjs/common";
import { IFilesService } from "../interfaces/files.service.interface";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { Project } from "src/types";
import { getDirectoryQuery, getReadFileQuery } from "../queries";
@Injectable()
export class GitlabFilesService implements IFilesService {
  constructor(private configService: ConfigService) {}

  async parseArguments(
    path: string
  ): Promise<{ domain: string; parsedPath: string }> {
    const gitlabGroup = this.configService.get("GITLAB_GROUP");
    const pathParts: string[] = path.split("/");
    const project: string = pathParts[0];

    // Only prepend the gitlabGroup if it's not already part of the path
    const domain: string =
      project === gitlabGroup ? project : gitlabGroup + "/" + project;

    const parsedPath = pathParts.slice(1).join("/");
    return { domain, parsedPath };
  }

  private async sendRequest(query: string): Promise<Project> {
    try {
      const response = await axios({
        url: "https://gitlab.com/api/graphql",
        method: "post",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.TOKEN}`,
        },
        data: {
          query: query,
        },
      });
      return response.data.data.project;
    } catch (error) {
      throw new Error("Invalid query"); // Throw error instead of returning string
    }
  }

  async executeQuery(path: string, getQuery: Function): Promise<Project> {
    const { domain, parsedPath } = await this.parseArguments(path);
    const query = getQuery(domain, parsedPath);
    return this.sendRequest(query);
  }

  async listDirectory(path: string): Promise<Project> {
    return this.executeQuery(path, getDirectoryQuery);
  }

  async readFile(path: string): Promise<Project> {
    return this.executeQuery(path, getReadFileQuery);
  }
}
