import { Injectable } from "@nestjs/common";
import { ApolloClient, InMemoryCache } from "@apollo/client/core";
import { IFilesService } from "../interfaces/files.service.interface";
import { ConfigService } from "@nestjs/config";
import { LIST_DIRECTORY, READ_FILE } from "../queries";

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

    const client = await this.createClient();

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

    return [...blobs, ...trees];
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
