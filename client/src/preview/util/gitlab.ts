import GitlabInstanceInterface from 'model/backend/gitlab/gitlab';

export function mapStringToAssetPath(type: string): string | undefined {
  switch (type) {
    case 'Functions':
      return 'functions';
    case 'Models':
      return 'models';
    case 'Tools':
      return 'tools';
    case 'Data':
      return 'data';
    case 'Digital Twins':
      return 'digital_twins';
    default:
      return undefined;
  }
}

class GitlabInstance extends GitlabInstanceInterface {
  public projectId: number | null = null;

  public commonProjectId: number | null = null;

  public triggerToken: string | null = null;

  constructor(projectName: string, host: string, oauthToken: string) {
    super(projectName, host, oauthToken);
    console.log('Fuck')
  }
}

export default GitlabInstance;
