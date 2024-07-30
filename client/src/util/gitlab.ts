import { ProjectSchema, PipelineTriggerTokenSchema } from '@gitbeaker/rest';

interface GitlabAPI {
    Projects: {
        search: (name: string) => Promise<ProjectSchema[]>;
    };
    PipelineTriggerTokens: {
        all: (projectId: number) => Promise<PipelineTriggerTokenSchema[]>;
        trigger: (projectId: number, ref: string, token: string, variables: { variables: Record<string, string> }) => Promise<void>;
    };
}

interface LogEntry {
    status: string;
    parameters?: Map<string, any>;
    error?: any;
}

class DigitalTwin {
    private DTName: string;
    private api: GitlabAPI;
    private logs: LogEntry[];

    constructor(DTName: string, api: GitlabAPI) {
        this.DTName = DTName;
        this.api = api;
        this.logs = [];
    }

    async getProjectId(): Promise<number | null> {
        try {
            const projects: ProjectSchema[] = await this.api.Projects.search(this.DTName);
            return projects.length > 0 ? projects[0].id : null;
        } catch (error) {
            console.error('Error fetching project ID:', error);
            return null;
        }
    }

    async getTriggerToken(projectId: number): Promise<string | null> {
        try {
            const triggers: PipelineTriggerTokenSchema[] = await this.api.PipelineTriggerTokens.all(projectId);
            return triggers.length > 0 ? triggers[0].token : null;
        } catch (error) {
            console.error('Error fetching pipeline trigger token:', error);
            return null;
        }
    }

    async execute(parameters: Map<string, any>): Promise<boolean> {
        const projectId = await this.getProjectId();
        if (projectId === null) {
            console.error('Project ID could not be determined');
            return false;
        }

        const triggerToken = await this.getTriggerToken(projectId);
        if (triggerToken === null) {
            console.error('Pipeline trigger token could not be determined');
            return false;
        }

        const variables = Object.fromEntries(parameters);

        try {
            await this.api.PipelineTriggerTokens.trigger(
                projectId,
                'main', 
                triggerToken,
                { variables }
            );
            this.logs.push({ status: 'success', parameters });
            return true;
        } catch (error) {
            console.error('Error triggering pipeline:', error);
            this.logs.push({ status: 'error', error, parameters });
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