import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs';
import { join } from 'path';
import { Project } from 'src/types.js';
import { IFilesService } from '../interfaces/files.service.interface.js';
import { CONFIG_MODE } from '../../enums/config-mode.enum.js';
import Config from '../../config/config.service.js';

@Injectable()
export default class LocalFilesService implements IFilesService {
  private readonly dataPath: string;

  constructor(private configService: Config) {
    this.dataPath = this.configService.getLocalPath();
  }
  
  init(): Promise<void> {
    return Promise.resolve();
  }

  getMode(): CONFIG_MODE {
    return CONFIG_MODE.LOCAL;
  }

  async listDirectory(path: string): Promise<Project> {
    const fullPath = join(this.dataPath, path);
    const files = await fs.promises.readdir(fullPath);

    const edges = await Promise.all(
      files.map((file) => LocalFilesService.getFileStats(fullPath, file)),
    );

    const tree = {
      trees: {
        edges: edges.filter((edge) => edge.node.type === 'tree'),
      },
      blobs: {
        edges: edges.filter((edge) => edge.node.type === 'blob'),
      },
    };

    return { repository: { tree } };
  }

  async readFile(path: string): Promise<Project> {
    const fullPath = join(this.dataPath, path);

    try {
      const content = await (
        await fs.promises.readFile(fullPath, 'utf8')
      ).trim();

      const name = path.split('/').pop(); // extract file name from the path

      return LocalFilesService.formatResponse(name, content);
    } catch (error) {
      throw new InternalServerErrorException('Error reading file', error);
    }
  }

  private static async getFileStats(fullPath: string, file: string) {
    const stats = await fs.promises.lstat(join(fullPath, file));
    if (stats.isDirectory()) {
      return { node: { name: file, type: 'tree' } };
    }
    return { node: { name: file, type: 'blob' } };
  }

  private static formatResponse(name: string, content: string): Project {
    // Construct the response to mimic the structure from GitLab API
    return {
      repository: {
        blobs: {
          nodes: [
            {
              name,
              rawBlob: content,
              rawTextBlob: content,
            },
          ],
        },
      },
    };
  }
}
