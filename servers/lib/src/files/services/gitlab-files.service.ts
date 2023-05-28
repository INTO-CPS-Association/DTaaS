import { Injectable } from "@nestjs/common";
import { ApolloClient, InMemoryCache, gql } from "@apollo/client/core";
import { IFilesService } from "../interfaces/files.service.interface";
import { ConfigService } from "@nestjs/config";
import { LIST_DIRECTORY, READ_FILE } from "../queries";
import axios from "axios";
import { Project, Tree } from "src/types";
@Injectable()
export class GitlabFilesService implements IFilesService {
  constructor(private configService: ConfigService) {}

  async parseArguments(
    path: string
  ): Promise<{ domain: string; parsedPath: string }> {
    const gitlabGroup = this.configService.get("GITLAB_GROUP");
    const pathParts: string[] = path.split("/");
    const project: string = pathParts[0];
    const domain: string = gitlabGroup + "/" + project;

    const parsedPath = pathParts.slice(1).join("/");
    return { domain, parsedPath };
  }

  async createClient() {
    return new ApolloClient({
      cache: new InMemoryCache(),
      uri: this.configService.get("GITLAB_URL"),
      headers: {
        Authorization: `Bearer ${this.configService.get("TOKEN")}`,
      },
    });
  }

  async listDirectory(path: string): Promise<Project> {
    const { domain, parsedPath } = await this.parseArguments(path);
    console.log(domain);
    console.log(parsedPath);

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

      console.dir(response.data.data.project.repository.tree, { depth: null });
      return response.data.data.project;
    } catch (error) {
      console.log(error.response.data);
      throw new Error("Invalid query"); // Throw error instead of returning string
    }
  }

  async readFile(path: string): Promise<Project> {
    const { domain, parsedPath } = await this.parseArguments(path);
    console.log(domain);
    console.log(parsedPath);

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

      console.dir(response.data.data.project.repository.blobs, { depth: null });
      return response.data.data.project;
    } catch (error) {
      console.log(error.response.data);
      throw new Error("Invalid query"); // Throw error instead of returning string
    }
  }
}
