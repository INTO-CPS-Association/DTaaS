import { GitlabInstance } from './gitlab';

const RUNNER_TAG = 'linux';

class DigitalTwin {
    public DTName: string;

    public description: string = '';

    public gitlabInstance: GitlabInstance;
    
    public pipelineId: number | null = null;
    
    private lastExecutionStatus: string | null = null;

    constructor(DTName: string, gitlabInstance: GitlabInstance) {
        this.DTName = DTName;
        this.gitlabInstance = gitlabInstance;
    } 

    async init() {
        if (this.gitlabInstance.projectId) {
            const readmePath = `digital_twins/${this.DTName}/description.md`;
            const fileData = await this.gitlabInstance.api.RepositoryFiles.show(this.gitlabInstance.projectId, readmePath, 'main');
            this.description = atob(fileData.content);
        } else {
            this.description = 'Error fetching description.';
        }
    }

    async execute(): Promise<number | null> {
        if (!this.gitlabInstance.projectId || !this.gitlabInstance.triggerToken) {
            this.lastExecutionStatus = 'error';
            return null;
        }
    
        const variables = { DTName: this.DTName, RunnerTag: RUNNER_TAG };
        
        try {
            const response = await this.gitlabInstance.api.PipelineTriggerTokens.trigger(this.gitlabInstance.projectId, 'main', this.gitlabInstance.triggerToken, { variables });
            this.gitlabInstance.logs.push({ status: 'success', DTName: this.DTName, runnerTag: RUNNER_TAG });
            this.lastExecutionStatus = 'success';
            this.pipelineId = response.id;
            return this.pipelineId;
        } catch (error) {
            this.gitlabInstance.logs.push({ status: 'error', error: new Error(String(error)), DTName: this.DTName, runnerTag: RUNNER_TAG });
            this.lastExecutionStatus = 'error';
            return null;
        }
    }    

    async stop(projectId: number, pipelineId: number): Promise<void> {
        try {
            await this.gitlabInstance.api.Pipelines.cancel(projectId, pipelineId);
            this.gitlabInstance.logs.push({ status: 'canceled', DTName: this.DTName, runnerTag: RUNNER_TAG });
            this.lastExecutionStatus = 'canceled';
        } catch (error) {
            this.gitlabInstance.logs.push({ status: 'error', error: new Error(String(error)), DTName: this.DTName, runnerTag: RUNNER_TAG });
            this.lastExecutionStatus = 'error';
        }
    }

    executionStatus(): string | null {
        return this.lastExecutionStatus;
    }
}

export default DigitalTwin;
