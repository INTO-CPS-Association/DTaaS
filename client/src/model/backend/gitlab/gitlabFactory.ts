import GitlabInstance from 'model/backend/gitlab/instance';
import GitlabAPI from 'model/backend/gitlab/backend';
import { BackendInterface } from 'model/backend/gitlab/UtilityInterfaces';
import { getAuthority } from 'util/envUtil';

export const createGitlabInstance = (
  projectName = sessionStorage.getItem('username'),
  accessToken = sessionStorage.getItem('access_token') ?? '',
): BackendInterface => {
  if (projectName == null) {
    throw new Error('Project name is not set in session storage.');
  }
  const GitlabAPIInstance = new GitlabAPI(getAuthority(), accessToken);
  return new GitlabInstance(projectName, GitlabAPIInstance);
};

export default createGitlabInstance;
