import GitlabInstance from 'model/backend/gitlab/instance';
import GitlabAPI from 'model/backend/gitlab/backend';
import { BackendInterface } from 'model/backend/interfaces/backendInterfaces';

export const createGitlabInstance = (
  projectName: string,
  accessToken: string,
  authority: string,
): BackendInterface => {
  const cleanedAuthority = authority.replace(/\/+$/, ''); // NOSONAR
  const GitlabAPIInstance = new GitlabAPI(cleanedAuthority, accessToken);
  return new GitlabInstance(projectName, GitlabAPIInstance);
};

export default createGitlabInstance;
