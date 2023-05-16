import { Injectable } from "@nestjs/common";
import * as fs from "fs";
import { join } from "path";
import { FilesService } from "../interfaces/files.service";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class LocalFilesService implements FilesService {
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
      return ["Invalid path"];
    }
  }
}
