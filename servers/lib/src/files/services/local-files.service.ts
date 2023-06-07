import { Injectable, InternalServerErrorException } from "@nestjs/common";
import * as fs from "fs";
import { join } from "path";
import { IFilesService } from "../interfaces/files.service.interface";
import { ConfigService } from "@nestjs/config";
import { Project } from "src/types";

@Injectable()
export class LocalFilesService implements IFilesService {
  constructor(private configService: ConfigService) {}

  async listDirectory(path: string): Promise<Project> {
    const dataPath = this.configService.get("LOCAL_PATH");
    const fullPath = join(dataPath, path);

    const files = await fs.promises.readdir(fullPath);

    const edges = await Promise.all(
      files.map((file) => this.getFileStats(fullPath, file))
    );

    const tree = {
      trees: {
        edges: edges.filter((edge) => edge.node.type === "tree"),
      },
      blobs: {
        edges: edges.filter((edge) => edge.node.type === "blob"),
      },
    };

    return { repository: { tree } };
  }

  async readFile(path: string): Promise<Project> {
    const dataPath = this.configService.get("LOCAL_PATH");
    const fullpath = join(dataPath, path);

    try {
      const content = await (
        await fs.promises.readFile(fullpath, "utf8")
      ).trim();

      const name = path.split("/").pop(); // extract file name from the path

      return this.formatResponse(name, content);
    } catch (error) {
      throw new InternalServerErrorException("Error reading file");
    }
  }

  private async getFileStats(fullPath: string, file: string) {
    const stats = await fs.promises.lstat(join(fullPath, file));
    if (stats.isDirectory()) {
      return { node: { name: file, type: "tree" } };
    } else {
      return { node: { name: file, type: "blob" } };
    }
  }

  private formatResponse(name: string, content: string): Project {
    // Construct the response to mimic the structure from GitLab API
    return {
      repository: {
        blobs: {
          nodes: [
            {
              name: name,
              rawBlob: content,
              rawTextBlob: content,
            },
          ],
        },
      },
    };
  }
}
