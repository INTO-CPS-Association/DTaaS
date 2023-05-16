import { Injectable } from "@nestjs/common";
import * as fs from "fs";
import { ConfigService } from "@nestjs/config";
import { join } from "path";
import { ApolloClient } from "@apollo/client/core";
import { InMemoryCache } from "@apollo/client/core";
import { LIST_DIRECTORY, READ_FILE } from "../queries";
@Injectable()
export class FilesService {
  constructor(private configService: ConfigService) {}

  async Wrapper(
    operation: "listDirectory" | "readFile",
    path: string
  ): Promise<string[]> {
    if (!path) {
      return ["Invalid query"];
    }

    const mode = this.configService.get("MODE");

    if (operation === "listDirectory") {
      if (mode === "local") {
        return this.listLocalDirectory(path);
      } else if (mode === "gitlab") {
        return this.listGitlabDirectory(path);
      }
    } else if (operation === "readFile") {
      if (mode === "local") {
        return this.readLocalFile(path);
      } else if (mode === "gitlab") {
        return this.readGitlabFile(path);
      }
    }

    return ["Invalid query"];
  }

  async listLocalDirectory(path: string): Promise<string[]> {
    const dataPath = this.configService.get("LOCAL_PATH");
    const fullpath = join(dataPath, path);
    return fs.readdirSync(fullpath);
  }

  async readLocalFile(path: string): Promise<string[]> {
    const dataPath = this.configService.get("LOCAL_PATH");
    const fullpath = join(dataPath, path);

    try {
      const content = fs.readFileSync(fullpath, "utf8");
      return [content];
    } catch (error) {
      return ["Invalid query"];
    }
  }

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
  async listGitlabDirectory(path: string): Promise<string[]> {
    const { domain, parsedPath } = await this.parseArguments(path);

    const client = new ApolloClient({
      cache: new InMemoryCache(),
      uri: this.configService.get("GITLAB_URL"),
      headers: {
        Authorization: `Bearer ${this.configService.get("TOKEN")}`,
      },
    });

    //console.log("client", client);

    const { data } = await client.query({
      query: LIST_DIRECTORY,
      variables: { path: parsedPath, domain: domain },
    });

    const blobs = data?.project?.repository?.tree?.blobs?.edges?.map(
      (edge: { node: { name: string; type: string } }) => edge.node.name
    );

    const trees = data?.project?.repository?.tree?.trees?.edges?.map(
      (edge: { node: { name: string; type: string } }) => edge.node.name
    );

    if (!blobs || !trees) {
      return ["Invalid query"];
    }

    // Concatenate the names of files (blobs) and directories (trees)
    return [...blobs, ...trees];
  }

  async readGitlabFile(path: string): Promise<string[]> {
    const { domain, parsedPath } = await this.parseArguments(path);
    const client = new ApolloClient({
      cache: new InMemoryCache(),
      uri: this.configService.get("GITLAB_URL"),
      headers: {
        Authorization: `Bearer ${this.configService.get("TOKEN")}`,
      },
    });

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
