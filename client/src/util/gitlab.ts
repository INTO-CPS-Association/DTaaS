    import { Gitlab } from '@gitbeaker/rest';

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
        public username: string;
        public api: InstanceType<typeof Gitlab>;
        public logs: LogEntry[];
        public subfolders: FolderEntry[] = [];

        constructor() {
            this.username = 'user1';
            this.api = new Gitlab({
                host: 'https://gitlab.com',
                token: 'glpat-CJknCUBMj8hSC3oibyxS'
            });
            this.logs = [];
        }

        async getProjectId(): Promise<number | null> {
            const groupPath = 'DTaaS';
            try {
                const group = await this.api.Groups.show(groupPath);
                const projects = await this.api.Groups.allProjects(group.id);
                const project = projects.find(proj => proj.name === this.username);
                if (project) {
                    return project.id;
                }
                return null;
            } catch (error) {
                return null;
            }
        }  

        async getTriggerToken(projectId: number): Promise<string | null> {
            try {
                const triggers = await this.api.PipelineTriggerTokens.all(projectId);
                if (triggers) {
                    return triggers[0].token;
                } 
                return null;
            } catch (error) {
                return null;
            }
        }

        async getDTSubfolders(projectId: number): Promise<FolderEntry[]> {
            const folderPath = 'digital_twins';
            try {
                const files = await this.api.Repositories.allRepositoryTrees(projectId, {
                    path: folderPath,
                    recursive: false,
                });

                this.subfolders = files
                    .filter(file => file.type === 'tree' && file.path !== folderPath)
                    .map(file => ({
                        name: file.name,
                        path: file.path
                    }));

                return this.subfolders;
            } catch (error) {
                return [];
            }
        }

        executionLogs(): LogEntry[] {
            return this.logs;
        }
    }

    export default GitlabInstance;