import { Injectable, InternalServerErrorException } from "@nestjs/common";
import * as fs from "fs";
import { join } from "path";
import { IFilesService } from "../interfaces/files.service.interface";
import { ConfigService } from "@nestjs/config";
import { Project } from "src/types";
import { readFile } from "fs/promises";
/*
@Injectable()
export class LocalFilesService implements IFilesService {
  constructor(private configService: ConfigService) {}

  async listDirectory(path: string): Promise<string[]> {
    const dataPath = this.configService.get("LOCAL_PATH");
    const fullpath = join(dataPath, path);
    return fs.readdirSync(fullpath);
  }

  async readFile(path: string): Promise<string[]> {
    const dataPath = this.configService.get("LOCAL_PATH");
    const fullpath = join(dataPath, path);

    try {
      const content = fs.readFileSync(fullpath, "utf8");
      return [content];
    } catch (error) {
      return ["Invalid query"];
    }
  }
}
 */

@Injectable()
export class LocalFilesService implements IFilesService {
  constructor(private configService: ConfigService) {}

  async listDirectory(path: string): Promise<Project> {
    const dataPath = this.configService.get("LOCAL_PATH");
    const fullPath = join(dataPath, path);
    const files = fs.readdirSync(fullPath);

    const tree = {
      trees: {
        edges: files
          .filter((file) => fs.lstatSync(join(fullPath, file)).isDirectory())
          .map((file) => ({ node: { name: file, type: "tree" } })),
      },
      blobs: {
        edges: files
          .filter((file) => !fs.lstatSync(join(fullPath, file)).isDirectory())
          .map((file) => ({ node: { name: file, type: "blob" } })),
      },
    };

    return { repository: { tree } };
  }

  async readFile(path: string): Promise<any> {
    const dataPath = this.configService.get("LOCAL_PATH");
    const fullpath = join(dataPath, path);

    try {
      const content = readFile(fullpath, "utf8");
      const name = path.split("/").pop(); // extract file name from the path

      // Construct the response to mimic the structure from GitLab API
      const response = {
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
