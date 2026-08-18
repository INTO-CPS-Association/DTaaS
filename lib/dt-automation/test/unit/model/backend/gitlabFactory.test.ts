import GitlabAPI from 'src/gitlab/backend';
import { BackendInterface } from 'src/interfaces/backendInterfaces';
import createGitlabInstance from 'src/gitlab/gitlabFactory';

jest.mock('src/gitlab/backend', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => jest.fn()),
}));

jest.mock('src/gitlab/gitlabFactory', () => ({
  __esModule: true,
  ...jest.requireActual('src/gitlab/gitlabFactory'),
}));

describe('gitlabFactory', () => {
  it('should create a GitlabInstance with the correct parameters', () => {
    const gitlabInstance: BackendInterface = createGitlabInstance(
      'username',
      'token',
      'auth',
    );

    expect(gitlabInstance).toBeDefined();
    expect(gitlabInstance.projectName).toBe('username');
    expect(GitlabAPI).toHaveBeenCalledWith('auth', 'token');
  });

  it('should strip multiple trailing slashes from authority', () => {
    createGitlabInstance('username', 'token', 'https://foo.com///');

    expect(GitlabAPI).toHaveBeenCalledWith('https://foo.com', 'token');
  });
});
