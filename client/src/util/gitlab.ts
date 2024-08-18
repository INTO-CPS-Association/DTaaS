import { Gitlab } from '@gitbeaker/rest';
import { getAuthority } from './envUtil';

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
        public username: string;

        public api: InstanceType<typeof Gitlab>;

        public logs: LogEntry[];

        public subfolders: FolderEntry[];

    constructor() {
        this.username = sessionStorage.getItem('username');
        this.api = new Gitlab({
            host: getAuthority(),
            oauthToken: sessionStorage.getItem('access_token') || 'null',
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

    async getRunnerTags(projectId: number): Promise<string[]> {
        try {
            // Ottieni i runner associati al progetto
            const runners = await this.api.Runners.all({ projectId });
    
            // Usa Promise.all per ottenere i dettagli di tutti i runner in parallelo
            const detailedRunners = await Promise.all(
                runners.map(runner => this.api.Runners.show(runner.id))
            );
    
            const tagsSet = new Set<string>();
    
            // Estrai i tag da ogni detailedRunner
            detailedRunners.forEach(detailedRunner => {
                // Verifica che detailedRunner.tag_list sia un array di stringhe
                if (Array.isArray(detailedRunner.tag_list)) {
                    detailedRunner.tag_list.forEach(tag => tagsSet.add(tag));
                } else {
                    // eslint-disable-next-line no-console
                    console.warn(`Unexpected tag_list type: ${typeof detailedRunner.tag_list}`);
                }
            });
    
            // Converte Set in Array e ritorna i tag
            return Array.from(tagsSet);
        } catch (error) {
            return [];
        }
    }   
     

    // Metodo per ottenere tutti i job di una pipeline specifica
  async getPipelineJobs(projectId: number, pipelineId: number) {
    try {
      return await this.api.Jobs.all(projectId, { pipelineId });
    } catch (error) {
      console.error('Errore nel recupero dei job:', error);
      return [];
    }
  }

  // Metodo per ottenere il log (trace) di un job specifico
  async getJobTrace(projectId: number, jobId: number) {
    try {
      return await this.api.Jobs.showLog(projectId, jobId);
    } catch (error) {
      console.error('Errore nel recupero del log del job:', error);
      return 'Impossibile recuperare il log.';
    }
  }
}

export { GitlabInstance, FolderEntry };