import { GitlabInstance, FolderEntry } from 'util/gitlab';
import { getAuthority } from 'util/envUtil';

class GitlabService {
    private gitlabInstance: GitlabInstance;

    constructor() {
      this.gitlabInstance = new GitlabInstance(
        sessionStorage.getItem('username') || '',
        getAuthority(),
        sessionStorage.getItem('access_token') || ''
      );
    }

  async getSubfolders(): Promise<FolderEntry[]> {
    if (!this.gitlabInstance) {
      throw new Error('GitlabInstance is not initialized');
    }
    const projectId = await this.gitlabInstance.getProjectId();
    if (projectId) {
      return this.gitlabInstance.getDTSubfolders(projectId);
    }
    return [];
  }

  getInstance(): GitlabInstance {
    return this.gitlabInstance;
  }
}

export default GitlabService;