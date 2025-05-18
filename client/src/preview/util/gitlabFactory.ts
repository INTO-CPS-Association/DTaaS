import GitlabInstance from 'model/backend/gitlab/gitlab';
import { BackendInterface } from 'model/backend/gitlab/interfaces';
import { getAuthority } from 'util/envUtil';

export const createGitlabInstance = (): BackendInterface => {
  const projectName = sessionStorage.getItem('username');
  const authority = getAuthority();
  const accessToken = sessionStorage.getItem('access_token') ?? '';

  if (projectName == null) {
    throw new Error('Project name is not set in session storage.');
  }
  return new GitlabInstance(projectName, authority, accessToken);
};

export default createGitlabInstance;
