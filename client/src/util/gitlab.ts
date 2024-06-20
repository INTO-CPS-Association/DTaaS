import { Gitlab } from '@gitbeaker/rest';

class DigitalTwin {
    DTName: string;
    api: any;
    logs: { status: string; parameters?: Map<string, any>; error?: any }[];

    constructor(DTName: string) {
        this.DTName = DTName;

        this.api = new Gitlab({
            oauthToken: sessionStorage.access_token,
        });
        this.logs = [];
    }

    async getProjectId(): Promise<number | null> {
        try {
            const project = await this.api.Projects.search(this.DTName);
    
            return project ? project.id : null;
        } catch (error) {
            console.error('Error fetching project ID:', error);
            return null;
        }
    }
    

    async getTriggerToken(projectId: number): Promise<string | null> {
        try {
            const triggers = await this.api.PipelineTriggerTokens.all(projectId);
            if (triggers && triggers.length > 0) {
                return triggers[0].token; 
            } else {
                console.error('No pipeline triggers found');
                return null;
            }
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
            console.error(error);
            this.logs.push({ status: 'error', error, parameters });
            return false;
        }
    }

    executionStatus(): string[] {
        return this.logs.map(log => log.status);
    }

    executionLogs(): { status: string; parameters?: Map<string, any>; error?: any }[] {
        return this.logs;
    }
}

export default DigitalTwin;