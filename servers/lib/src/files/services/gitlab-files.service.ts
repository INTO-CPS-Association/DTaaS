import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Project } from 'src/types';
import { IFilesService } from '../interfaces/files.service.interface';
import { getDirectoryQuery, getReadFileQuery } from '../queries';

type QueryFunction = (domain: string, parsedPath: string) => string;

@Injectable()
export default class GitlabFilesService implements IFilesService {
  // eslint-disable-next-line no-useless-constructor, no-empty-function
  constructor(private configService: ConfigService) {}

  async listDirectory(path: string): Promise<Project> {
    return this.executeQuery(path, getDirectoryQuery);
  }

  async readFile(path: string): Promise<Project> {
    return this.executeQuery(path, getReadFileQuery);
  }

  private async parseArguments(
    path: string,
  ): Promise<{ domain: string; parsedPath: string }> {
    const gitlabGroup = this.configService.get('GITLAB_GROUP');
    const pathParts: string[] = path.split('/');
    const project: string = pathParts[0];

    // Only prepend the gitlabGroup if it's not already part of the path
    const domain: string =
      project === gitlabGroup ? project : `${gitlabGroup}/${project}`;

    const parsedPath = pathParts.slice(1).join('/');
    return { domain, parsedPath };
  }

  private async sendRequest(query: string): Promise<Project> {
    try {
      const response = await axios({
        url: 'https://gitlab.com/api/graphql',
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.configService.get('GITLAB_TOKEN')}`,
        },
        data: {
          query,
        },
      });
      return response.data.data.project;
    } catch (error) {
      throw new Error('Invalid query'); // Throw error instead of returning string
    }
  }

  private async executeQuery(
    path: string,
    getQuery: QueryFunction,
  ): Promise<Project> {
    const { domain, parsedPath } = await this.parseArguments(path);
    const query = getQuery(domain, parsedPath);
    return this.sendRequest(query);
  }
}
