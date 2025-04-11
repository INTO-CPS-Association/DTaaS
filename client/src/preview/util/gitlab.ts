import GitlabInstanceInterface from 'model/backend/gitlab/gitlab';

class GitlabInstance extends GitlabInstanceInterface {
  public projectId: number | null = null;

  public commonProjectId: number | null = null;

  public triggerToken: string | null = null;

  constructor(projectName: string, host: string, oauthToken: string) {
    super(projectName, host, oauthToken);
  }
}

export default GitlabInstance;
