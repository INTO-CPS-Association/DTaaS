import { Injectable } from "@nestjs/common";
import { IFilesService } from "../interfaces/files.service.interface";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { Project } from "src/types";
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

  async listDirectory(path: string): Promise<Project> {
    const { domain, parsedPath } = await this.parseArguments(path);

    try {
      const response = await axios({
        url: "https://gitlab.com/api/graphql",
        method: "post",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.TOKEN}`,
        },
        data: {
          query: `
            query listDirectory {
              project(fullPath: "${domain}") {
                repository {
                  tree(path: "${parsedPath}", recursive: false) {
                    blobs {
                      edges {
                        node {
                          name
                          type
                          
                        }
                      }
                    }
                    trees {
                      edges {
                        node {  
                          name
                          type
                        }
                      }
                    }
                  }
                }
              }
            }
          `,
        },
      });

      return response.data.data.project;
    } catch (error) {
      throw new Error("Invalid query"); // Throw error instead of returning string
    }
  }

  async readFile(path: string): Promise<Project> {
    const { domain, parsedPath } = await this.parseArguments(path);

    try {
      const response = await axios({
        url: "https://gitlab.com/api/graphql",
        method: "post",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.TOKEN}`,
        },
        data: {
          query: `
            query readFile {
              project(fullPath: "${domain}") {
                repository {
                  blobs(paths: "${parsedPath}") {
                    nodes {
                      name
                      rawBlob
                      rawTextBlob
                    }
                  }
                }
              }
            }
          `,
        },
      });

      return response.data.data.project;
    } catch (error) {
      throw new Error("Invalid query"); // Throw error instead of returning string
    }
  }
}
