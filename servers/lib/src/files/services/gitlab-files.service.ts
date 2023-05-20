import { Injectable } from "@nestjs/common";
import { ApolloClient, InMemoryCache, gql } from "@apollo/client/core";
import { IFilesService } from "../interfaces/files.service.interface";
import { ConfigService } from "@nestjs/config";
import { LIST_DIRECTORY, READ_FILE } from "../queries";
import axios from "axios";
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

  async listDirectory(path: string): Promise<string[]> {
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
              project(fullPath: "dtaas/user2") {
                repository {
                  tree(path: "", recursive: false) {
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

      console.dir(response.data, { depth: null });
      return response.data;
    } catch (error) {
      console.log(error.response.data);
      return ["Invalid query"];
    }
  }

  async readFile(path: string): Promise<string[]> {
    const { domain, parsedPath } = await this.parseArguments(path);

    const client = await this.createClient();

    const { data } = await client.query({
      query: READ_FILE,
      variables: { domain: domain, path: [parsedPath] },
    });

    const nodes = data?.project?.repository?.blobs?.nodes;

    if (!nodes) {
      return ["Invalid query"];
    }

    return [nodes[0].rawTextBlob];
  }
}
