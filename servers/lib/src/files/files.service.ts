import { Injectable } from "@nestjs/common";
import * as fs from "fs";
import { ConfigService } from "@nestjs/config";
import { join } from "path";
import { ApolloClient } from "@apollo/client/core";
import { InMemoryCache } from "@apollo/client/core";
import { DIRECTORY_LIST } from "../queries";
@Injectable()
export class FilesService {
  constructor(private configService: ConfigService) {}

  async Wrapper(
    operation: "getFiles" | "getFileContent",
    path: string,
    filePath?: string
  ): Promise<string[]> {
    if (!path) {
      return ["Invalid query"];
    }

    const mode = this.configService.get("MODE");

    if (operation === "getFiles") {
      if (mode === "local") {
        return this.getLocalFiles(path);
      } else if (mode === "gitlab") {
        return this.getGitlabFiles(path);
      }
    } else if (operation === "getFileContent" && filePath) {
      if (mode === "gitlab") {
        return this.getGitlabFileContent(path, filePath);
      } else if (mode === "local") {
        return this.getLocalFileContent(path, filePath);
      }
    }

    return ["Invalid query"];
  }

  async getLocalFiles(path: string): Promise<string[]> {
    const dataPath = this.configService.get("LOCAL_PATH");
    const fullpath = join(dataPath, path);
    return fs.readdirSync(fullpath);
  }

  async getLocalFileContent(path: string, filePath: string): Promise<string[]> {
    return ["Local files not supported yet"];
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
      query: DIRECTORY_LIST,
      variables: { path: path, domain: domain },
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

  async getGitlabFileContent(
    projectPath: string,
    filePath: string
  ): Promise<string[]> {
    const gitlabGroup = this.configService.get("GITLAB_GROUP");
    const token = this.configService.get("TOKEN");
    const gitlabUrl = this.configService.get("GITLAB_URL");

    const client = new ApolloClient({
      cache: new InMemoryCache(),
      uri: gitlabUrl,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log("projectPath: " + projectPath);
    console.log("filePath: " + filePath);

    const { data } = await client.query({
      query: gql`
        query fileContent($projectPath: ID!, $filePath: [String!]!) {
          project(fullPath: $projectPath) {
            repository {
              blobs(paths: $filePath) {
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
      variables: { projectPath, filePath: [filePath] },
    });

    const nodes = data?.project?.repository?.blobs?.nodes;

    if (!nodes) {
      return ["Invalid query"];
    }

    return [nodes[0].rawTextBlob];
  }
}
