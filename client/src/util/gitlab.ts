    import { Gitlab } from '@gitbeaker/rest';

    const GROUP_NAME = 'DTaaS';
    const DT_DIRECTORY = 'digital_twins';

interface LogEntry {
    status: string;
    DTName: string;
    runnerTag: string;
    error?: Error;
}

interface FolderEntry {
    name: string;
    path: string;
}

    class GitlabInstance {
        public username: string | null;

        public api: InstanceType<typeof Gitlab>;

        public logs: LogEntry[];

        public subfolders: FolderEntry[];

        constructor(username: string, host: string, oauthToken: string) {
            this.username = username
            this.api = new Gitlab({
            host: host,
            oauthToken: oauthToken,
        });
            this.logs = [];
            this.subfolders = [];
        }

        async getProjectId(): Promise<number | null> {
            let projectId: number | null = null;
        
                const group = await this.api.Groups.show(GROUP_NAME);
                const projects = await this.api.Groups.allProjects(group.id);
                const project = projects.find(proj => proj.name === this.username);
        
                if (project) {
                    projectId = project.id;
                }
        
            return projectId;
        }
         

        async getTriggerToken(projectId: number): Promise<string | null> {
            let token: string | null = null;
        
            const triggers = await this.api.PipelineTriggerTokens.all(projectId);
            if (triggers && triggers.length > 0) {
                token = triggers[0].token;
            }
            return token;
        }
        

        async getDTSubfolders(projectId: number): Promise<FolderEntry[]> {
            let subfolders: FolderEntry[] = [];
    
            const files = await this.api.Repositories.allRepositoryTrees(projectId, {
                path: DT_DIRECTORY,
                recursive: false,
            });

            subfolders = files
                .filter(file => file.type === 'tree' && file.path !== DT_DIRECTORY)
                .map(file => ({
                    name: file.name,
                    path: file.path
                }));
    
            this.subfolders = subfolders;
            return subfolders;
        }

        executionLogs(): LogEntry[] {
            return this.logs;
        }
    }

    export default GitlabInstance;