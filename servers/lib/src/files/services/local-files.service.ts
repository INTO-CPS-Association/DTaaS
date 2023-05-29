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

    const tree = {
      trees: {
        edges: (
          await Promise.all(
            files.map(async (file) => {
              const stats = await fs.promises.lstat(join(fullPath, file));
              if (stats.isDirectory()) {
                return { node: { name: file, type: "tree" } };
              }
            })
          )
        ).filter((edge) => edge !== undefined),
      },
      blobs: {
        edges: (
          await Promise.all(
            files.map(async (file) => {
              const stats = await fs.promises.lstat(join(fullPath, file));
              if (!stats.isDirectory()) {
                return { node: { name: file, type: "blob" } };
              }
            })
          )
        ).filter((edge) => edge !== undefined),
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

      // Construct the response to mimic the structure from GitLab API
      const response: Project = {
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
      return response;
    } catch (error) {
      throw new InternalServerErrorException("Error reading file");
    }
  }
}
