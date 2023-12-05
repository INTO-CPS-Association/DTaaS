import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import { Project } from 'src/types';
import { IFilesService } from '../interfaces/files.service.interface';

@Injectable()
export default class LocalFilesService implements IFilesService {
  // eslint-disable-next-line no-useless-constructor, no-empty-function
  constructor(private configService: ConfigService) {}

  GetFullPath(path: string) {
    const dataPath = this.configService.get('LOCAL_PATH');
    const pathParts = path.split('/');
    return pathParts[0] === this.configService.get('GITLAB_GROUP')
      ? join(dataPath, pathParts.splice(1).join('/'))
      : join(dataPath, pathParts.join('/'));
  }

  async listDirectory(path: string): Promise<Project> {
    const fullPath = this.GetFullPath(path);

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
    const fullPath = this.GetFullPath(path);

    try {
      const content = await (
        await fs.promises.readFile(fullPath, 'utf8')
      ).trim();

      const name = fullPath.split('/').pop(); // extract file name from the path

      return LocalFilesService.formatResponse(name, content);
    } catch (error) {
      throw new InternalServerErrorException('Error reading file');
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
