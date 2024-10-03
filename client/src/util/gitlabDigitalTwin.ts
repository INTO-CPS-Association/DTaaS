import GitlabInstance from './gitlab';

const RUNNER_TAG = 'linux';

export const formatName = (name: string) =>
  name.replace(/-/g, ' ').replace(/^./, (char) => char.toUpperCase());

class DigitalTwin {
  public DTName: string;

  public description: string | undefined = '';

  public fullDescription: string = '';

  public gitlabInstance: GitlabInstance;

  public pipelineId: number | null = null;

  public lastExecutionStatus: string | null = null;

  public jobLogs: { jobName: string; log: string }[] = [];

  public pipelineLoading: boolean = false;

  public pipelineCompleted: boolean = false;

  public descriptionFiles: string[] = [];

  public configFiles: string[] = [];

  constructor(DTName: string, gitlabInstance: GitlabInstance) {
    this.DTName = DTName;
    this.gitlabInstance = gitlabInstance;
  }

  async getFullDescription(): Promise<void> {
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

  isValidInstance(): boolean {
    return !!(
      this.gitlabInstance.projectId && this.gitlabInstance.triggerToken
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

  logError(error: string): void {
    this.gitlabInstance.logs.push({
      status: 'error',
      error: new Error(error),
      DTName: this.DTName,
      runnerTag: RUNNER_TAG,
    });
    this.lastExecutionStatus = 'error';
  }

  async triggerPipeline() {
    const variables = { DTName: this.DTName, RunnerTag: RUNNER_TAG };
    return this.gitlabInstance.api.PipelineTriggerTokens.trigger(
      this.gitlabInstance.projectId!,
      'main',
      this.gitlabInstance.triggerToken!,
      { variables },
    );
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

  async delete(): Promise<string> {
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

  async getDescriptionFiles(): Promise<void> {
    try {
      const response =
        await this.gitlabInstance.api.Repositories.allRepositoryTrees(
          this.gitlabInstance.projectId!,
          {
            path: `digital_twins/${this.DTName}`,
            recursive: true,
          },
        );

      const filteredFiles = response
        .filter(
          (item: { type: string; name: string; path: string }) =>
            item.type === 'blob' &&
            (item.name.endsWith('.md') ||
              item.name.endsWith('.yml') ||
              item.path.includes('/lifecycle/')),
        )
        .map((file: { name: string }) => file.name);

      this.descriptionFiles = filteredFiles;
    } catch (error) {
      this.descriptionFiles = [];
    }
  }

  async getConfigFiles(): Promise<void> {
    try {
      const response =
        await this.gitlabInstance.api.Repositories.allRepositoryTrees(
          this.gitlabInstance.projectId!,
          {
            path: `digital_twins/${this.DTName}`,
            recursive: false,
          },
        );

      const filteredFiles = response
        .filter(
          (item: { type: string; name: string }) =>
            item.type === 'blob' && item.name.endsWith('.json'),
        )
        .map((file: { name: string }) => file.name);

      this.configFiles = filteredFiles;
    } catch (error) {
      this.configFiles = [];
    }
  }

  async getFileContent(fileName: string): Promise<string> {
    const isFileWithoutExtension = !fileName.includes('.');

    const filePath = isFileWithoutExtension
      ? `digital_twins/${this.DTName}/lifecycle/${fileName}`
      : `digital_twins/${this.DTName}/${fileName}`;

    const response = await this.gitlabInstance.api.RepositoryFiles.show(
      this.gitlabInstance.projectId!,
      filePath,
      'main',
    );
    const fileContent = atob(response.content);
    return fileContent;
  }

  async updateFileContent(
    fileName: string,
    fileContent: string,
  ): Promise<void> {
    const hasExtension = fileName.includes('.');

    const filePath = hasExtension
      ? `digital_twins/${this.DTName}/${fileName}`
      : `digital_twins/${this.DTName}/lifecycle/${fileName}`;

    const commitMessage = `Update ${fileName} content`;
    await this.gitlabInstance.api.RepositoryFiles.edit(
      this.gitlabInstance.projectId!,
      filePath,
      'main',
      fileContent,
      commitMessage,
    );
  }
}

export default DigitalTwin;
