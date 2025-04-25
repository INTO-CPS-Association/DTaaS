import GitlabInstance, {
  BackendInterface,
} from 'model/backend/gitlab/interfaces';
import { getAuthority } from 'util/envUtil';

export const createGitlabInstance = (): BackendInterface => {
  const projectName = sessionStorage.getItem('username') || '';
  const authority = getAuthority();
  const accessToken = sessionStorage.getItem('access_token') || '';

  return new GitlabInstance(projectName, authority, accessToken);
};

export default createGitlabInstance;
