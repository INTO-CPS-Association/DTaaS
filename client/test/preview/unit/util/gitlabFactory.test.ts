import GitlabInstance from 'model/backend/gitlab/gitlab';
import createGitlabInstance from 'preview/util/gitlabFactory';

describe('createGitlabInstance', () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it('should create a GitlabInstance with the correct parameters', () => {
    sessionStorage.setItem('username', 'testUser');
    const gitlabInstance: GitlabInstance = createGitlabInstance();

    expect(gitlabInstance).toBeDefined();
    expect(gitlabInstance.projectName).toBe('testUser');
  });

  it('should create a GitlabInstance with the correct parameters', () => {
    const gitlabInstance: GitlabInstance = createGitlabInstance();

    expect(gitlabInstance).toBeDefined();
    expect(gitlabInstance.projectName).toBe('');
  });
});
