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
}

export default DigitalTwin;
