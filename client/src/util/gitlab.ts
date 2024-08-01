import { Gitlab } from '@gitbeaker/rest';

interface LogEntry {
    status: string;
    DTName: string;
    runnerTag: string;
    error?: Error;
}

class DigitalTwin {
    private DTName: string;
    private username: string;
    public api: InstanceType<typeof Gitlab>;
    private logs: LogEntry[];

    constructor(DTName: string) {
        this.DTName = DTName;
        this.username = sessionStorage.getItem('username') || '';
        this.api = new Gitlab({
            oauthToken: sessionStorage.getItem('access_token') || '',
        });
        this.logs = [];
    }

    async getProjectId(): Promise<number | null> {
        try {
            const projects = await this.api.Projects.search(this.username);
            return projects.length > 0 ? projects[0].id : null;
        } catch (error) {
            return null;
        }
    }

    async getTriggerToken(projectId: number): Promise<string | null> {
        try {
            const triggers = await this.api.PipelineTriggerTokens.all(projectId);
            if (triggers.length === 1) {
                return triggers[0].token;
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    async execute(runnerTag: string): Promise<boolean> {
        const projectId = await this.getProjectId();
        if (projectId === null) {
            return false;
        }

        const triggerToken = await this.getTriggerToken(projectId);
        if (triggerToken === null) {
            return false;
        }

        const variables = {
            DTName: this.DTName,
            RunnerTag: runnerTag,
        }

        try {
            await this.api.PipelineTriggerTokens.trigger(
                projectId,
                'main', 
                triggerToken,
                { variables }
            );
            this.logs.push({ status: 'success', DTName: this.DTName, runnerTag: runnerTag });
            return true;
        } catch (error) {
            this.logs.push({ status: 'error', error: error instanceof Error ? error : new Error(String(error)), DTName: this.DTName, runnerTag: runnerTag });
            return false;
        }
    }

    executionStatus(): string[] {
        return this.logs.map(log => log.status);
    }

    executionLogs(): LogEntry[] {
        return this.logs;
    }
}

export default DigitalTwin;