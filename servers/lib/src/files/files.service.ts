import { Injectable } from "@nestjs/common";
import * as fs from "fs";
import { ConfigService } from "@nestjs/config";
import { join } from "path";
import { ApolloClient, gql } from "@apollo/client/core";
import { InMemoryCache } from "@apollo/client/core";

@Injectable()
export class FilesService {
  constructor(private configService: ConfigService) {}

  async Wrapper(path: string): Promise<string[]> {
    if (!path) {
      return ["Invalid query"];
    }
    const mode = this.configService.get("MODE");
    if (mode === "local") {
      return this.getLocalFiles(path);
    } else if (mode === "gitlab") {
      return this.getGitlabFiles(path);
    } else {
      return ["Invalid query"];
    }
  }

  async getLocalFiles(path: string): Promise<string[]> {
    const dataPath = this.configService.get("LOCAL_PATH");
    const fullpath = join(dataPath, path);
    return fs.readdirSync(fullpath);
  }

  async getGitlabFiles(path: string): Promise<string[]> {
    const gitlabGroup = this.configService.get("GITLAB_GROUP");
    const token = this.configService.get("TOKEN");
    const gitlabUrl = this.configService.get("GITLAB_URL");

    const pathParts: string[] = path.split("/");
    const project: string = pathParts[0];
    const domain: string = gitlabGroup + "/" + project;

    path = pathParts.slice(1).join("/");

    const client = new ApolloClient({
      cache: new InMemoryCache(),
      uri: gitlabUrl,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const { data } = await client.query({
      query: gql`
        query directorylist($path: String!, $domain: ID!) {
          project(fullPath: $domain) {
            webUrl
            path
            repository {
              paginatedTree(path: $path, recursive: false) {
                nodes {
                  trees {
                    nodes {
                      name
                    }
                  }
                }
              }
              diskPath
            }
          }
        }
      `,
      variables: { path, domain: domain },
    });

    const trees = data?.project?.repository?.paginatedTree?.nodes?.flatMap(
      (node: { trees: { nodes: { name: string }[] } }) =>
        node.trees.nodes.map((tree: { name: string }) => tree.name)
    );

    if (!trees) {
      return ["Invalid query"];
    }

    return trees;
  }
}
