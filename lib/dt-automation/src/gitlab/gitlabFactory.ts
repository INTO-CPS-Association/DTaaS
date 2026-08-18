import GitlabInstance from 'src/gitlab/instance';
import GitlabAPI from 'src/gitlab/backend';
import { BackendInterface } from 'src/interfaces/backendInterfaces';

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
