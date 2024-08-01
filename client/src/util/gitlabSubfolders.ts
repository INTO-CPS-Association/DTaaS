import { Gitlab } from '@gitbeaker/rest';

interface FolderEntry {
    name: string;
    path: string;
}

class DigitalTwinSubfolders {
    public api: InstanceType<typeof Gitlab>;
    private subfolders: FolderEntry[] = [];

    constructor() {
        this.api = new Gitlab({
            oauthToken: sessionStorage.getItem('access_token') || '',
        });
    }

    async getDTSubfolders(projectId: number): Promise<FolderEntry[]> {
        const folderPath = 'digital_twins';
        
        try {
            const files = await this.api.Repositories.allRepositoryTrees(projectId, {
                path: folderPath,
                recursive: true,
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
}

export default DigitalTwinSubfolders;