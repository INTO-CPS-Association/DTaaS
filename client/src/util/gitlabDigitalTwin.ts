import { GitlabInstance } from './gitlab';

class DigitalTwin {
    public DTName: string;

    public description: string | null = null;

    public gitlabInstance: GitlabInstance;

    public lastExecutionStatus: string | null = null;

    constructor(DTName: string, gitlabInstance: GitlabInstance) {
        this.DTName = DTName;
        this.gitlabInstance = gitlabInstance;
    }

    public async initDescription(): Promise<void> {
        const projectId = await this.gitlabInstance.getProjectId();
        if (projectId === null) {
            return;
        }

        try {
            const readmePath = `digital_twins/${this.DTName}/description.md`;
            const fileData = await this.gitlabInstance.api.RepositoryFiles.show(projectId, readmePath, 'main');
            
            // Decodifica il contenuto in base64 a UTF-8 (per ambiente browser)
            this.description = atob(fileData.content);
        } catch (error) {
            // eslint-disable-next-line no-console
            console.log('Error fetching README.md:', error);
        }
    
        const variables = { DTName: this.DTName, RunnerTag: runnerTag };
        
        try {
            await this.gitlabInstance.api.PipelineTriggerTokens.trigger(projectId, 'main', triggerToken, { variables });
            this.gitlabInstance.logs.push({ status: 'success', DTName: this.DTName, runnerTag });
            this.lastExecutionStatus = 'success';
            return true;
        } catch (error) {
            this.gitlabInstance.logs.push({ status: 'error', error: new Error(String(error)), DTName: this.DTName, runnerTag });
            this.lastExecutionStatus = 'error';
            return false;
        }
    }    

    executionStatus(): string | null {
        return this.lastExecutionStatus;
    }
}

export default DigitalTwin;
