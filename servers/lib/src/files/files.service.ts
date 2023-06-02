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

  async createClient() {
    return new ApolloClient({
      cache: new InMemoryCache(),
      uri: this.configService.get("GITLAB_URL"),
      headers: {
        Authorization: `Bearer ${this.configService.get("TOKEN")}`,
      },
    });
  }
  async getGitlabFiles(path: string): Promise<string[]> {
    const gitlabGroup = this.configService.get("GITLAB_GROUP");

    const pathParts: string[] = path.split("/");
    const project: string = pathParts[0];
    const domain: string = gitlabGroup + "/" + project;

    path = pathParts.slice(1).join("/");

    const client = await this.createClient();

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
}
