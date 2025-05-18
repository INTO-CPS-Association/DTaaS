import { BackendInterface } from 'model/backend/gitlab/interfaces';
import createGitlabInstance from 'preview/util/gitlabFactory';

describe('createGitlabInstance', () => {
  const store: Record<string, string> = {};

  beforeAll(() => {
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => {
          store[key] = value;
        },
        clear: () => {
          Object.keys(store).forEach((key) => {
            delete store[key];
          });
        },
      },
      writable: true,
    });
  });

  afterEach(() => {});

  it('should create a GitlabInstance with the correct parameters', () => {
    sessionStorage.setItem('username', 'testUser');
    const gitlabInstance: BackendInterface = createGitlabInstance();

    expect(gitlabInstance).toBeDefined();
    expect(gitlabInstance.projectName).toBe('testUser');
  });

  it('should not create a GitlabInstance without projectId in session storage', () => {
    sessionStorage.clear();
    expect(() => {
      createGitlabInstance();
    }).toThrow('Project name is not set in session storage.');
  });
});
