import GitlabInstance from 'model/backend/gitlab/instance';
import GitlabAPI from 'model/backend/gitlab/backend';
import { BackendInterface } from 'model/backend/gitlab/UtilityInterfaces';

export const createGitlabInstance = (
  projectName: string,
  accessToken: string,
  authority: string,
): BackendInterface => {
  const GitlabAPIInstance = new GitlabAPI(authority, accessToken);
  return new GitlabInstance(projectName, GitlabAPIInstance);
};

export default createGitlabInstance;
