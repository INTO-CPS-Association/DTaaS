import GitlabAPI from 'model/backend/gitlab/backend';
import { BackendInterface } from 'model/backend/interfaces/backendInterfaces';
import createGitlabInstance from 'model/backend/gitlab/gitlabFactory';

jest.mock('model/backend/gitlab/backend', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => jest.fn()),
}));

jest.mock('model/backend/gitlab/gitlabFactory', () => ({
  ...jest.requireActual('model/backend/gitlab/gitlabFactory'),
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
});
