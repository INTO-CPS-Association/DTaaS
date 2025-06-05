import GitlabInstance from 'model/backend/gitlab/gitlab';
import GitlabAPI from 'model/backend/gitlab/gitlabAPI';
import { BackendInterface } from 'model/backend/gitlab/interfaces';
import { getAuthority } from 'util/envUtil';

export const createGitlabInstance = (): BackendInterface => {
  const projectName = sessionStorage.getItem('username');
  const authority = getAuthority();
  const accessToken = sessionStorage.getItem('access_token') ?? '';

  if (projectName == null) {
    throw new Error('Project name is not set in session storage.');
  }
  const GitlabAPIInstance = new GitlabAPI(authority, accessToken);
  return new GitlabInstance(projectName, GitlabAPIInstance);
};

export default createGitlabInstance;
