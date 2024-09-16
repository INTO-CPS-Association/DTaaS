/* eslint-disable no-console */

import { GitlabInstance } from './gitlab';

const RUNNER_TAG = 'linux';

export const formatName = (name: string) =>
  name.replace(/-/g, ' ').replace(/^./, (char) => char.toUpperCase());

class DigitalTwin {
  public DTName: string;

  public description: string = '';

  public fullDescription: string = '';

  public gitlabInstance: GitlabInstance;

  public pipelineId: number | null = null;

  public lastExecutionStatus: string | null = null;

  public executionCount: number = 0;

  public jobLogs: { jobName: string; log: string }[] = [];

  public pipelineLoading: boolean = false;

  public pipelineCompleted: boolean = false;

  public descriptionFiles: string[] = [];

  constructor(DTName: string, gitlabInstance: GitlabInstance) {
    this.DTName = DTName;
    this.gitlabInstance = gitlabInstance;
  }

  async getFullDescription() {
    if (this.gitlabInstance.projectId) {
      const readmePath = `digital_twins/${this.DTName}/README.md`;
      try {
        const fileData = await this.gitlabInstance.api.RepositoryFiles.show(
          this.gitlabInstance.projectId,
          readmePath,
          'main',
        );
        this.fullDescription = atob(fileData.content);
      } catch (error) {
        this.fullDescription = `There is no README.md file in the ${this.DTName} GitLab folder`;
      }
    } else {
      this.fullDescription = 'Error fetching description, retry.';
    }
  }

  async execute(): Promise<number | null> {
    if (!this.isValidInstance()) {
      this.logError('Missing projectId or triggerToken');
      return null;
    }

    try {
      const response = await this.triggerPipeline();
      this.logSuccess();
      this.pipelineId = response.id;
      return this.pipelineId;
    } catch (error) {
      this.logError(String(error));
      return null;
    }
  }

  isValidInstance(): boolean {
    return !!(
      this.gitlabInstance.projectId && this.gitlabInstance.triggerToken
    );
  }

  private async triggerPipeline() {
    const variables = { DTName: this.DTName, RunnerTag: RUNNER_TAG };
    return this.gitlabInstance.api.PipelineTriggerTokens.trigger(
      this.gitlabInstance.projectId!,
      'main',
      this.gitlabInstance.triggerToken!,
      { variables },
    );
  }

  logSuccess(): void {
    this.gitlabInstance.logs.push({
      status: 'success',
      DTName: this.DTName,
      runnerTag: RUNNER_TAG,
    });
    this.lastExecutionStatus = 'success';
  }

  private logError(error: string): void {
    this.gitlabInstance.logs.push({
      status: 'error',
      error: new Error(error),
      DTName: this.DTName,
      runnerTag: RUNNER_TAG,
    });
    this.lastExecutionStatus = 'error';
  }

  async stop(projectId: number, pipelineId: number): Promise<void> {
    try {
      await this.gitlabInstance.api.Pipelines.cancel(projectId, pipelineId);
      this.gitlabInstance.logs.push({
        status: 'canceled',
        DTName: this.DTName,
        runnerTag: RUNNER_TAG,
      });
      this.lastExecutionStatus = 'canceled';
    } catch (error) {
      this.gitlabInstance.logs.push({
        status: 'error',
        error: new Error(String(error)),
        DTName: this.DTName,
        runnerTag: RUNNER_TAG,
      });
      this.lastExecutionStatus = 'error';
    }
  }

  async delete() {
    if (this.gitlabInstance.projectId) {
      const digitalTwinPath = `digital_twins/${this.DTName}`;
      try {
        await this.gitlabInstance.api.RepositoryFiles.remove(
          this.gitlabInstance.projectId,
          digitalTwinPath,
          'main',
          `Removing ${this.DTName} digital twin`,
        );
        return `${this.DTName} deleted successfully`;
      } catch (error) {
        return `Error deleting ${this.DTName} digital twin`;
      }
    }
    return `Error deleting ${this.DTName} digital twin: no project id`;
  }

  async getDescriptionFiles() {
    console.log('GitlabInstance dentro la funzione', this.gitlabInstance);
    try {
      const response =
        await this.gitlabInstance.api.Repositories.allRepositoryTrees(
          this.gitlabInstance.projectId!,
          {
            path: 'digital_twins/mass-spring-damper',
            recursive: false, // Non fare una ricerca ricorsiva
          },
        );

      // Filtra i file che non finiscono con .json
      const filteredFiles = response
        .filter(
          (item: { type: string; name: string }) =>
            item.type === 'blob' && !item.name.endsWith('.json'),
        )
        .map((file: { name: string }) => file.name);

      // Ordina i file mettendo il file del DT per primo
      const sortedFiles = [
        formatName(this.DTName),
        ...filteredFiles.filter((name) => name !== this.DTName),
      ];

      this.descriptionFiles = sortedFiles;
    } catch (error) {
      this.descriptionFiles = [];
    }
  }
}

export default DigitalTwin;
