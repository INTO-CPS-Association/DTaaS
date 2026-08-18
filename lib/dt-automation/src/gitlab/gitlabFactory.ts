import GitlabInstance from 'model/gitlab/instance';
import GitlabAPI from 'model/gitlab/backend';
import { BackendInterface } from 'model/interfaces/backendInterfaces';

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
