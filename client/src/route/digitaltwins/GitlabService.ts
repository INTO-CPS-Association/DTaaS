/* eslint-disable no-console */

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

    async getSubfolders(): Promise<FolderEntry[] | string> {
      try {
        if (!this.gitlabInstance) {
          throw new Error('GitlabInstance is not initialized');
        }
        const projectId = await this.gitlabInstance.getProjectId();
        if (projectId) {
          return this.gitlabInstance.getDTSubfolders(projectId);
        }
        return [];
      } catch (error) {
        if (error instanceof Error && error.message.includes('NetworkError')) {
          console.log("Error: There is no ‘DTaaS’ group associated with your account.", error);
          return 'There is no ‘DTaaS’ group associated with your GitLab account.';
        }
        console.error('An error occurred:', error);
        return 'An error occurred';
      }
  }

  getInstance(): GitlabInstance {
    return this.gitlabInstance;
  }
}

export default GitlabService;